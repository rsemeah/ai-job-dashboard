# HireWire Architecture

## Overview

HireWire is a job application dashboard with a strict separation of concerns:

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Frontend      │────▶│      n8n        │────▶│   Supabase      │
│  (Thin Client)  │     │ (Orchestration) │     │   (State)       │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                                               │
         └───────────────── reads ───────────────────────┘
```

## Architectural Rules

### 1. Frontend is a Thin Client ONLY

The Next.js frontend should:
- Accept job URL input from users
- Validate only basic URL correctness (valid URL, http/https protocol)
- Submit URLs to the n8n intake webhook
- Read job state from Supabase
- Display honest status, partial parse, duplicate, manual review, generation, complete, and error states
- Allow users to manually change status and view generated materials

The frontend should NOT:
- Fetch or parse job pages
- Score jobs against profiles
- Generate resumes or cover letters
- Make decisions about job fit
- Perform deduplication logic

### 2. n8n Owns All Orchestration and Business Logic

n8n workflows handle:
- Fetching job pages from URLs
- Source detection (Greenhouse, Lever, LinkedIn, etc.)
- Parsing job details (title, company, location, description, requirements)
- Canonicalization and deduplication
- Scoring against user profile
- Resume generation
- Cover letter generation
- Writing results back to Supabase
- Logging processing events

### 3. Supabase Owns All Persistent State

Supabase stores:
- `jobs` - Canonical job records with lifecycle state
- `user_profile` - User profile for scoring and generation
- `processing_events` - Detailed workflow event logs (created by n8n)
- `generated_documents` - Generated materials (optional separate table)
- `profile_versions` - Profile snapshots for reproducibility (future)

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

### Required
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (server-side)
- `N8N_JOB_INTAKE_WEBHOOK_URL` - n8n webhook endpoint for job intake

### Optional
- `N8N_JOB_INTAKE_WEBHOOK_TOKEN` - Bearer token for webhook auth

## API Contracts

### Intake Request (Frontend → n8n)
```json
{
  "url": "https://boards.greenhouse.io/company/jobs/123",
  "source_hint": "GREENHOUSE",
  "submitted_by_user_id": "user-uuid",
  "request_id": "req-uuid"
}
```

### Intake Response (n8n → Frontend)
```json
{
  "accepted": true,
  "request_id": "req-uuid",
  "job_id": "job-uuid",
  "status": "processing_started",
  "message": "Job submitted for processing",
  "duplicate": false,
  "partial_parse": false
}
```

## Current Transitional Violations

None - the frontend is now a thin client. All AI processing logic has been removed.

## What Must Be Implemented in n8n

1. **Job Intake Workflow**
   - Receive webhook POST with URL
   - Detect source (Greenhouse, Lever, LinkedIn, generic)
   - Fetch page content
   - Parse job details
   - Check for duplicates
   - Write initial job record to Supabase

2. **Scoring Workflow**
   - Read job and user profile from Supabase
   - Calculate structured fit score
   - Identify strengths and gaps
   - Update job with score
   - Log scoring event

3. **Generation Workflow**
   - Read job and profile
   - Generate tailored resume
   - Generate cover letter
   - Update job with generated materials
   - Log generation event

4. **Event Logging**
   - Create `processing_events` table in Supabase
   - Log all workflow steps for observability

## Supabase Schema Requirements

### jobs table (existing, needs expansion)
```sql
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS parse_quality text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS parse_missing_fields text[];
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS score_title_match numeric;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS score_seniority_match numeric;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS score_domain_match numeric;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS score_location_match numeric;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS score_skills_match numeric;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS score_compensation_match numeric;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS score_dealbreakers text[];
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS score_summary text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS canonical_url text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS ats_job_id text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS fingerprint_hash text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS duplicate_of_job_id uuid;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS generation_profile_version text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS generation_timestamp timestamptz;
```

### processing_events table (new)
```sql
CREATE TABLE processing_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES jobs(id),
  event_type text NOT NULL,
  message text,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);
```
