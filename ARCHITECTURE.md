# HireWire Architecture

## Overview

HireWire is a job application dashboard with strict separation of concerns:

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Frontend      │────▶│      n8n        │────▶│   Supabase      │
│  (Thin Client)  │     │ (Orchestration) │     │   (State)       │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                                               │
         └───────────────── reads ───────────────────────┘
```

## Layer Responsibilities

### Frontend (Next.js) — Display Only
- Accept job URL input from users
- Validate basic URL correctness (valid URL, http/https protocol)
- Submit URLs to n8n intake webhook with `request_id` for tracing
- Read job state from Supabase
- Display honest status indicators (processing, partial parse, duplicate, error)
- Allow users to manually update status and view generated materials

### n8n — All Business Logic
- Fetch job pages from URLs
- Detect source (Greenhouse, Lever, LinkedIn, etc.)
- Parse job details (title, company, location, requirements)
- Canonicalization and deduplication
- Score against user profile
- Generate resumes and cover letters
- Write results to Supabase
- Log processing events

### Supabase — All Persistent State
- `jobs` — Canonical job records with lifecycle state
- `user_profile` — User profile for scoring and generation
- `processing_events` — Workflow event logs (from n8n)
- `generated_documents` — Versioned materials
- `profile_snapshots` — Profile versions for reproducibility

## Job Lifecycle States

```
submitted → fetching → parsing → parsed/parsed_partial → 
  scoring → scored/below_threshold → generating_documents → 
    ready/manual_review_required → applied → interviewing → offered
                                                          → rejected
                                                          → declined
```

Terminal states: `duplicate`, `rejected`, `declined`, `archived`
Error state: `error` (can occur at any step)

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key |
| `N8N_JOB_INTAKE_WEBHOOK_URL` | Yes | n8n webhook for job intake |
| `N8N_JOB_INTAKE_WEBHOOK_TOKEN` | No | Bearer token for webhook auth |
| `GROQ_API_KEY` | No | For AI features (if not using n8n) |

## API Contracts

### Intake Request (Frontend → n8n)
```json
{
  "url": "https://boards.greenhouse.io/company/jobs/123",
  "source_hint": "GREENHOUSE",
  "request_id": "uuid-for-tracing"
}
```

### Intake Response (n8n → Frontend)
```json
{
  "accepted": true,
  "request_id": "uuid-for-tracing",
  "job_id": "job-uuid",
  "status": "processing_started",
  "duplicate": false,
  "partial_parse": false
}
```

## Database Schema (Applied)

### jobs table
Key fields:
- `id`, `title`, `company`, `source`, `source_url`, `status`, `fit`, `score`
- `canonical_url`, `ats_job_id`, `fingerprint_hash` — deduplication
- `duplicate_of_job_id` — links to original if duplicate
- `parse_quality`, `parse_missing_fields` — parse status
- `score_*` — structured scoring breakdown
- `generated_resume`, `generated_cover_letter` — AI materials
- `error_message`, `error_step` — error tracking
- `request_id` — traces back to original request

### processing_events table
```sql
id uuid PRIMARY KEY
job_id uuid REFERENCES jobs(id)
request_id uuid
event_type text NOT NULL
message text
metadata jsonb
created_at timestamptz
```

### profile_snapshots table
Stores frozen profile state at generation time for reproducibility.

### generated_documents table
Stores versioned resume/cover letter with model metadata.

## System Overview

All orchestration runs inside Next.js API routes. There is no external webhook processor or n8n dependency.

```
Browser
  └─ POST /api/analyze          ← job URL input
    └─ Groq (llama-3.3-70b)  ← parse & score
    └─ Supabase: insert job + job_analyses
    └─ runJobFlow()           ← in-process orchestrator
      └─ POST /api/generate-documents
        └─ Groq (llama-3.3-70b)  ← resume + cover letter
        └─ Supabase: update job, evidence_library
      └─ POST /api/jobs/[id]/interview-prep
        └─ Groq (llama-3.1-8b-instant) ← STAR stories + angles
        └─ Supabase: insert interview_prep
  └─ Supabase Realtime / polling ← status updates to UI
```

## Layers

### Frontend (Next.js App Router)

**Responsibilities:**
- Accept job URLs and manual entries from the user
- Call `/api/analyze` (URL path) or `/api/jobs/[id]/run-flow` (manual path)
- Poll job status and reflect transitions in `job-detail.tsx`
- Render generated resume, cover letter, and interview prep
- Export to DOCX via `/api/export/resume`

### API Routes (in-app orchestration)

| Route | Role |
|---|---|
| `POST /api/analyze` | URL intake: fetch page, run Groq analysis, insert job, call runJobFlow |
| `POST /api/jobs/[id]/run-flow` | Trigger generation pipeline for an existing job |
| `POST /api/generate-documents` | Generate resume + cover letter with schema-driven provenance |
| `POST /api/jobs/[id]/interview-prep` | Generate STAR stories and angles from evidence |
| `GET /api/export/resume` | Render resume as DOCX |
| `GET/POST /api/profile` | Read/write user_profile |

### AI Layer (Groq)

- **Model for analysis + generation**: `llama-3.3-70b-versatile`
- **Model for quality checks + interview prep**: `llama-3.1-8b-instant`
- All calls use the Vercel AI SDK `generateObject` / `generateText`
- Quality check step auto-retries generation up to 2× if score < threshold

### Supabase

**Tables:**
- `jobs` — job listings, status, scores, generated content
- `user_profile` — resume data (keyed on `full_name`, not `name`)
- `evidence_library` — extracted resume bullet provenance per job
- `job_analyses` — raw Groq analysis output per job
- `interview_prep` — STAR stories and angles per job
- `run_ledger` — structured per-step observability log
- `processing_events` — legacy activity log (retained for compatibility)

**Storage:**
- `avatars` bucket — user avatar uploads (must be created manually in Supabase dashboard)

**Auth:**
- Supabase Auth with Google OAuth, magic link, and password providers
- Session managed via `@supabase/ssr` cookies
- Auth callback at `/auth/callback` checks for `user_profile.full_name`; redirects to `/onboarding` if absent

## Job Lifecycle

```
queued          → job inserted, pipeline not yet started
analyzing       → Groq extracting title/company/description/score
analyzed        → analysis complete, generation not started
generating      → /api/generate-documents in progress
ready           → resume + cover letter generated, quality check passed
needs_review    → quality check score below threshold after retries
error           → pipeline step failed (see run_ledger for details)
applied         → user marked as applied
interviewing    → user moved to interview stage
offered         → offer received
rejected        → rejected
archived        → removed from active pipeline
```

## Data Flow — URL Intake

1. User pastes URL in dashboard
2. `POST /api/analyze` — fetches page, calls Groq, inserts `jobs` row with `status: analyzing`
3. `runJobFlow()` called synchronously — calls `/api/generate-documents`
4. Generation writes resume/cover letter back to `jobs`, inserts `evidence_library` rows
5. Job `status` set to `ready` (or `needs_review` / `error`)
6. `interview-prep` generation triggered; inserts `interview_prep` rows
7. `run_ledger` rows written at each step for observability

## Required Environment Variables

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase service role key (server-side only) |
| `GROQ_API_KEY` | ✅ | Groq API key for all AI operations |
