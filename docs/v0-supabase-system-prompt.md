# HireWire v0 / Code Generator System Prompt

Use this system context whenever generating or modifying HireWire code with v0, Cursor, Claude, or similar code generation tools.

## Core Architecture (Current)

**HireWire is an evidence-based job application engine.** All orchestration runs inside Next.js API routes. There is **no n8n or external orchestrator dependency**.

```
Browser
  └─ POST /api/analyze (job URL intake)
       └─ Groq analysis (llama-3.3-70b)
       └─ Insert job + job_analyses
       └─ runJobFlow() (in-process)
            └─ POST /api/generate-documents
            └─ POST /api/generate-interview-prep
  └─ Supabase (Postgres + RLS)
```

## Supabase Schema (Canonical)

### Authentication
- Supabase Auth (Google OAuth, Magic Link, Password)
- Session via `@supabase/ssr` cookies
- Auth callback at `/auth/callback` checks for `user_profile.full_name`

### Core Tables
| Table | Purpose | Key Columns |
|---|---|---|
| `jobs` | Job listings, status, analysis results | `id`, `user_id`, `status`, `title`, `company`, `source_url`, `score`, `generated_resume`, `generated_cover_letter`, `generation_error` |
| `user_profile` | Resume data (keyed per user) | `id`, `user_id`, `full_name` (NOT `name`), `email`, `location`, `summary`, `experience`, `education`, `skills`, `tools`, `domains` |
| `evidence_library` | Extracted resume bullet provenance per job | `id`, `user_id`, `job_id`, `category`, `bullet_text`, `source_profile_section` |
| `job_analyses` | Raw Groq analysis output | `id`, `user_id`, `job_id`, `keywords`, `parsed_description`, `raw_analysis` |
| `interview_prep` | STAR stories and angle cards | `id`, `user_id`, `job_id`, `star_stories`, `angle_cards`, `talking_points` |
| `run_ledger` | Per-step observability log | `id`, `user_id`, `job_id`, `step_name`, `status`, `summary`, `error_details`, `created_at` |
| `processing_events` | Legacy activity log (for compatibility) | `id`, `user_id`, `event_type`, `job_id`, `message`, `metadata` |

### Storage
- `avatars` bucket — user profile images (optional, gracefully fails if missing)

### RLS Policies
- **All user-scoped tables enforce**: user can only SELECT/INSERT/UPDATE/DELETE their own rows
- Policy pattern: `auth.uid() = user_id` on every write operation
- Tables without explicit RLS in code must still have RLS enabled and policies set in Supabase

## Environment Requirements

**Required** (must be present):
- `NEXT_PUBLIC_SUPABASE_URL` — public Supabase URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — public Supabase key
- `SUPABASE_SERVICE_ROLE_KEY` — secret service role key (server-only)
- `GROQ_API_KEY` — Groq API key for all AI (analysis, generation, interview prep)

**Optional/Deprecated:**
- N8N_JOB_INTAKE_WEBHOOK_URL, N8N_JOB_INTAKE_WEBHOOK_TOKEN — **IGNORE, not used**

## Job Lifecycle (Canonical Status Values)

```
queued → analyzing → analyzed → generating → ready
                      ↓
                generating → needs_review (if quality check fails)
                      ↓
                    error (if generation fails)

From ready: applied → interviewing → offered/rejected/archived
```

Valid status enum: `'queued' | 'analyzing' | 'analyzed' | 'generating' | 'ready' | 'needs_review' | 'error' | 'applied' | 'interviewing' | 'offered' | 'rejected' | 'archived'`

## API Route Patterns

### Authentication Enforcement
All API routes that access user data must:
1. Extract user ID from Supabase session
2. Check that user_id matches request parameters or query filters
3. **Never** trust user input for user_id — always get it from auth context

```typescript
// Correct pattern
const { data: { user } } = await supabase.auth.getUser()
if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

const userId = user.id
const data = await supabase
  .from("jobs")
  .select("*")
  .eq("user_id", userId)  // Always filter by authenticated user
  .eq("id", jobId)
```

### Generation Flow
- `/api/analyze` — Entry point, calls Groq, inserts job, triggers `runJobFlow()`
- `/api/generate-documents` — Creates resume + cover letter, updates job status
- `/api/generate-interview-prep` — Creates STAR stories and angles
- `/api/jobs/[id]/run-flow` — Manual trigger for existing job (orchestrator)
- `/api/export/resume` — Exports to DOCX

## Component / UI Types

### Job in Code
```typescript
interface Job {
  id: string
  user_id: string
  status: 'queued' | 'analyzing' | 'analyzed' | 'generating' | 'ready' | 'needs_review' | 'error' | 'applied' | 'interviewing' | 'offered' | 'rejected' | 'archived'
  title: string
  company: string
  source_url: string
  score?: number
  generated_resume?: string
  generated_cover_letter?: string
  generation_error?: string
  created_at: string
  updated_at: string
}
```

### UserProfile in Code
```typescript
interface UserProfile {
  id: string
  user_id: string
  full_name: string  // NOT "name"
  email: string | null
  location: string | null
  summary: string | null
  experience: Array<{ role: string; company: string; bullets: string[] }>
  education: Array<{ degree: string; school: string; year: string }>
  skills: string[]
  tools: string[]
  domains: string[]
  avatar_url?: string
  created_at: string
  updated_at: string
}
```

## Constraints & Rules

1. **Always use `full_name`, never `name`** in user_profile queries and updates
2. **Always filter by `user_id`** in multi-user operations — Supabase RLS will enforce this, but do it anyway
3. **Status values are lowercase with underscores** (`ready_for_review` NOT `Ready For Review`)
4. **Generation is Groq-based, not mock** — GROQ_API_KEY must be present; no fallback to stub responses
5. **Interview prep requires job analysis first** — cannot generate interview prep without job.analyzed_at
6. **Evidence mapping is human-curated** — `/api/generate-documents` takes optional `selected_evidence_ids` to allow user override
7. **Error logging is mandatory** — every API route must log to `run_ledger` on error; include `error_details`
8. **Interview prep generation uses llama-3.1-8b-instant**, not 70b (cost optimization)
9. **No hardcoded URLs** — use `VERCEL_URL` at runtime or fallback to request origin
10. **Profile must exist before generation** — `/auth/callback` redirects to `/onboarding` if `user_profile.full_name` is null

## Feature Flags / Feature States

- **Interview prep**: Generated only after document generation succeeds
- **Multiple resume templates**: Supported (stored in localStorage on client)
- **Avatar upload**: Optional, fails gracefully if `avatars` bucket doesn't exist
- **Evidence library**: Can be auto-populated OR user can curate manually

## What NOT to Do

- ❌ Reference `N8N_JOB_INTAKE_WEBHOOK_URL` or N8N integration
- ❌ Assume `generated_documents` table exists (it may not; use `jobs.generated_resume` instead)
- ❌ Use `name` column in user_profile (always use `full_name`)
- ❌ Trust client-provided user_id (always extract from auth session)
- ❌ Generate documents without Groq API key present
- ❌ Skip error logging to run_ledger on API route errors
- ❌ Assume `avatars` bucket exists (handle missing bucket gracefully)

## Migration State

Migrations 001-011 must be applied in order:
- 001-010: Core schema, user_id columns, RLS policies
- 011: `user_profile.full_name` convergence (handles legacy `name` column)

If a table exists but seems to be missing columns, check migration status in Supabase — migrations may not have been applied.

---

**Last Updated**: March 30, 2026  
**Status**: Production-ready, in-app orchestration (no n8n)
