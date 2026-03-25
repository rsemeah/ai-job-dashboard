# HireWire Architecture

## System Overview

```
User submits URL → Frontend → n8n webhook → Supabase → Frontend displays
```

## Layers

### Frontend (Next.js / v0.dev)

**Responsibilities:**
- Collect job URLs from user
- POST to n8n webhook
- Read job state from Supabase
- Display real data (no fake states)

**Does NOT:**
- Parse job pages
- Score jobs
- Generate documents
- Perform AI operations

### n8n (Orchestration)

**Responsibilities:**
- Receive webhook calls
- Fetch job pages (HTTP)
- Parse job data (title, company, description)
- Deduplicate jobs
- Score against profile (stub OK)
- Generate materials (stub OK)
- Write to Supabase
- Log processing events

**Webhook URL:**
- Test: `https://redlanternstudios.app.n8n.cloud/webhook-test/job-intake`
- Production: `https://redlanternstudios.app.n8n.cloud/webhook/job-intake`

### Supabase (Storage)

**Tables:**
- `jobs` - Job listings and state
- `user_profile` - Resume data
- `processing_events` - Activity log
- `generated_documents` - AI materials
- `profile_snapshots` - Profile versions

## Job Statuses

```
submitted          → Job URL received
fetching           → Fetching page content
parsing            → Extracting job data
parsed_partial     → Partial extraction
duplicate          → Already in system
scoring            → Evaluating fit
below_threshold    → Score too low
generating_documents → Creating materials
manual_review_required → Needs human input
complete           → Ready to apply
error              → Processing failed
```

## Data Flow

1. **Submit**: User pastes URL in frontend
2. **Intake**: Frontend POSTs to n8n webhook
3. **Fetch**: n8n fetches the job page
4. **Parse**: n8n extracts title/company/description
5. **Store**: n8n inserts into Supabase `jobs`
6. **Display**: Frontend reads from Supabase
7. **Score**: n8n scores job (async)
8. **Generate**: n8n creates resume/cover letter (async)

## API Contracts

### Intake Webhook Request

```json
POST /webhook/job-intake
{
  "jobUrl": "https://boards.greenhouse.io/...",
  "source": "hirewire",
  "submittedAt": "2024-01-01T00:00:00.000Z",
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

### Intake Webhook Response

```json
{
  "accepted": true,
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "submitted",
  "message": "Job intake received"
}
```

## Rules

1. Accept ANY URL (no whitelist)
2. Partial parse is OK
3. Never block the request
4. Always return a response
5. Frontend never does AI work
