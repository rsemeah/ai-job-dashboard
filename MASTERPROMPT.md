# HireWire Masterprompt

> Single source of truth for AI agents working on HireWire across v0, n8n, Supabase, and GitHub Codespaces.

---

## 1. System Overview

HireWire is a **full-auto job application pipeline** that:
1. Accepts job URLs from any source
2. Parses job details via n8n workflow
3. Scores fit against user profile
4. Generates tailored resume + cover letter
5. Queues for one-click apply

### Architecture Layers

| Layer | Technology | Responsibility |
|-------|------------|----------------|
| **Frontend** | Next.js 15 + v0 | Thin client. Submit URLs, display data, show states. NO business logic. |
| **Orchestration** | n8n | ALL business logic. Fetch, parse, score, generate, write to Supabase. |
| **Database** | Supabase | Persistent storage. Jobs, profile, events, documents. |
| **AI** | Groq (via n8n) | Scoring and document generation. |

---

## 2. Supabase Schema

### 2.1 Tables

```sql
-- JOBS: Core job records
CREATE TABLE jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Source tracking
  source_url text NOT NULL,
  canonical_url text,
  ats_job_id text,
  fingerprint_hash text,
  source text, -- 'greenhouse', 'lever', 'linkedin', 'other'
  
  -- Parsed fields
  title text,
  company text,
  location text,
  salary_range text,
  employment_type text,
  description text,
  requirements text[],
  
  -- Processing state
  status text NOT NULL DEFAULT 'submitted',
  request_id uuid,
  parse_quality text, -- 'full', 'partial', 'failed'
  parse_missing_fields text[],
  error_message text,
  error_step text,
  
  -- Scoring
  score integer,
  fit text, -- 'HIGH', 'MEDIUM', 'LOW'
  score_strengths text[],
  score_gaps text[],
  score_reasoning text,
  
  -- Generated materials
  generated_resume text,
  generated_cover_letter text,
  profile_snapshot_id uuid,
  generation_timestamp timestamptz,
  
  -- Dedup
  duplicate_of_job_id uuid REFERENCES jobs(id),
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  parsed_at timestamptz,
  applied_at timestamptz
);

-- PROCESSING_EVENTS: Activity log from n8n
CREATE TABLE processing_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES jobs(id) ON DELETE CASCADE,
  request_id uuid,
  event_type text NOT NULL,
  message text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- USER_PROFILE: Single user profile for scoring/generation
CREATE TABLE user_profile (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text,
  email text,
  phone text,
  location text,
  summary text,
  experience jsonb,
  education jsonb,
  skills text[],
  certifications text[],
  links jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- PROFILE_SNAPSHOTS: Versioned profile for reproducibility
CREATE TABLE profile_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES user_profile(id) ON DELETE CASCADE,
  snapshot_version integer NOT NULL DEFAULT 1,
  snapshot_payload jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- GENERATED_DOCUMENTS: Versioned materials
CREATE TABLE generated_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES jobs(id) ON DELETE CASCADE,
  profile_snapshot_id uuid REFERENCES profile_snapshots(id),
  document_type text NOT NULL, -- 'resume', 'cover_letter'
  content text NOT NULL,
  version integer NOT NULL DEFAULT 1,
  generation_model text,
  created_at timestamptz DEFAULT now()
);
```

### 2.2 Indexes

```sql
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_canonical_url ON jobs(canonical_url);
CREATE INDEX idx_jobs_fingerprint_hash ON jobs(fingerprint_hash);
CREATE INDEX idx_jobs_request_id ON jobs(request_id);
CREATE INDEX idx_processing_events_job_id ON processing_events(job_id);
CREATE INDEX idx_processing_events_created_at ON processing_events(created_at DESC);
```

### 2.3 Canonical Statuses

```
submitted        → Job URL received, waiting for processing
fetching         → Fetching HTML from source URL
parsing          → Extracting job details from HTML
parsed           → Successfully parsed all fields
parsed_partial   → Parsed but missing some fields
duplicate        → Duplicate of existing job
scoring          → Scoring against user profile
scored           → Score calculated
below_threshold  → Score below apply threshold
generating_documents → Creating resume/cover letter
manual_review_required → Needs human review
ready            → All materials ready, waiting to apply
applied          → Application submitted
interviewing     → In interview process
offered          → Received offer
rejected         → Application rejected
declined         → User declined opportunity
archived         → Removed from active pipeline
error            → Processing failed
```

---

## 3. n8n Workflow Specification

### 3.1 Webhook Endpoint

**URL:** `https://redlanternstudios.app.n8n.cloud/webhook/job-intake`
**Method:** POST
**Content-Type:** application/json

### 3.2 Incoming Payload (from v0)

```json
{
  "jobUrl": "https://boards.greenhouse.io/company/jobs/123456",
  "source": "hirewire",
  "submittedAt": "2026-03-25T12:00:00.000Z",
  "requestId": "uuid-v4"
}
```

### 3.3 Workflow Steps

```
1. RECEIVE WEBHOOK
   ├─ Extract jobUrl, requestId
   └─ Log event: { event_type: "received", request_id }

2. DEDUP CHECK
   ├─ Query Supabase: SELECT id FROM jobs WHERE canonical_url = $1 OR fingerprint_hash = $2
   ├─ If duplicate:
   │   ├─ Log event: { event_type: "duplicate_detected" }
   │   └─ Return { status: "duplicate", existingJobId }
   └─ Continue if not duplicate

3. INSERT PENDING JOB
   ├─ INSERT INTO jobs (source_url, status, request_id) VALUES ($1, 'submitted', $2)
   ├─ Log event: { event_type: "job_created", job_id }
   └─ Capture job_id for subsequent steps

4. FETCH PAGE
   ├─ UPDATE jobs SET status = 'fetching' WHERE id = $job_id
   ├─ HTTP GET jobUrl with browser User-Agent
   ├─ Log event: { event_type: "page_fetched", status_code }
   └─ If error: UPDATE jobs SET status = 'error', error_step = 'fetch'

5. PARSE JOB
   ├─ UPDATE jobs SET status = 'parsing' WHERE id = $job_id
   ├─ Detect source type (Greenhouse, Lever, LinkedIn, Other)
   ├─ Extract: title, company, location, salary, description, requirements
   ├─ Calculate fingerprint_hash = SHA256(company + title + location)
   ├─ UPDATE jobs SET title, company, location, description, status = 'parsed'
   ├─ Log event: { event_type: "parsed", parse_quality }
   └─ If partial: SET status = 'parsed_partial', parse_missing_fields = [...]

6. FETCH PROFILE
   ├─ SELECT * FROM user_profile LIMIT 1
   ├─ Create profile snapshot if needed
   └─ Store profile_snapshot_id

7. SCORE FIT
   ├─ UPDATE jobs SET status = 'scoring' WHERE id = $job_id
   ├─ Call Groq API with prompt:
   │   "Score this job against the candidate profile. Return JSON:
   │    { score: 0-100, fit: HIGH|MEDIUM|LOW, strengths: [], gaps: [], reasoning: '' }"
   ├─ UPDATE jobs SET score, fit, score_strengths, score_gaps, status = 'scored'
   ├─ Log event: { event_type: "scored", score, fit }
   └─ If score < threshold: SET status = 'below_threshold'

8. GENERATE DOCUMENTS (if score >= threshold)
   ├─ UPDATE jobs SET status = 'generating_documents' WHERE id = $job_id
   ├─ Call Groq API for tailored resume
   ├─ Call Groq API for cover letter
   ├─ INSERT INTO generated_documents (job_id, document_type, content)
   ├─ UPDATE jobs SET generated_resume, generated_cover_letter, status = 'ready'
   └─ Log event: { event_type: "documents_generated" }

9. RETURN RESPONSE
   └─ Return { status: "success", jobId, score, fit }
```

### 3.4 Response Payload (to v0)

```json
{
  "status": "success",
  "jobId": "uuid",
  "message": "Job processed successfully",
  "score": 85,
  "fit": "HIGH"
}
```

### 3.5 Error Response

```json
{
  "status": "error",
  "message": "Failed to fetch page",
  "step": "fetch",
  "requestId": "uuid"
}
```

### 3.6 Duplicate Response

```json
{
  "status": "duplicate",
  "message": "Job already exists",
  "existingJobId": "uuid"
}
```

---

## 4. v0 Frontend Contract

### 4.1 What v0 Does

1. **Submit URL** → POST to n8n webhook with `{ jobUrl, source, submittedAt, requestId }`
2. **Poll/Read Supabase** → Fetch jobs by request_id or list all
3. **Display States** → Render UI based on job.status
4. **User Actions** → Mark applied, archive, edit

### 4.2 What v0 Does NOT Do

- No AI calls (Groq)
- No HTML fetching/parsing
- No scoring logic
- No document generation
- No business rules

### 4.3 Environment Variables (v0)

```bash
# Supabase (auto-configured via integration)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# n8n Webhook (optional - has fallback)
N8N_JOB_INTAKE_WEBHOOK_URL=https://redlanternstudios.app.n8n.cloud/webhook/job-intake
```

---

## 5. GitHub Codespaces Setup

### 5.1 devcontainer.json

```json
{
  "name": "HireWire Dev",
  "image": "mcr.microsoft.com/devcontainers/typescript-node:22",
  "features": {
    "ghcr.io/devcontainers/features/node:1": { "version": "22" }
  },
  "postCreateCommand": "pnpm install",
  "forwardPorts": [3000],
  "customizations": {
    "vscode": {
      "extensions": [
        "esbenp.prettier-vscode",
        "dbaeumer.vscode-eslint",
        "bradlc.vscode-tailwindcss"
      ],
      "settings": {
        "editor.defaultFormatter": "esbenp.prettier-vscode",
        "editor.formatOnSave": true
      }
    }
  },
  "secrets": {
    "NEXT_PUBLIC_SUPABASE_URL": { "description": "Supabase project URL" },
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": { "description": "Supabase anon key" },
    "SUPABASE_SERVICE_ROLE_KEY": { "description": "Supabase service role key" }
  }
}
```

### 5.2 Quick Start

```bash
# 1. Open in Codespaces
gh codespace create --repo rsemeah/ai-job-dashboard

# 2. Copy env
cp .env.example .env.local

# 3. Add Supabase credentials to .env.local

# 4. Start dev server
pnpm dev
```

---

## 6. Groq Prompts (for n8n)

### 6.1 Scoring Prompt

```
You are an expert career advisor. Score how well this job matches the candidate.

JOB:
Title: {{title}}
Company: {{company}}
Description: {{description}}
Requirements: {{requirements}}

CANDIDATE:
Name: {{profile.full_name}}
Summary: {{profile.summary}}
Experience: {{profile.experience}}
Skills: {{profile.skills}}

Return ONLY valid JSON:
{
  "score": <0-100>,
  "fit": "<HIGH|MEDIUM|LOW>",
  "strengths": ["strength1", "strength2", "strength3"],
  "gaps": ["gap1", "gap2"],
  "reasoning": "<2-3 sentence explanation>"
}

Scoring guide:
- 80-100 (HIGH): Strong match, meets most requirements
- 50-79 (MEDIUM): Partial match, some gaps but transferable skills
- 0-49 (LOW): Significant gaps, unlikely to succeed
```

### 6.2 Resume Generation Prompt

```
Generate a tailored resume for this job application.

JOB:
Title: {{title}}
Company: {{company}}
Key Requirements: {{requirements}}

CANDIDATE PROFILE:
{{profile}}

SCORING ANALYSIS:
Strengths: {{strengths}}
Gaps: {{gaps}}

Instructions:
1. Emphasize experiences matching the job requirements
2. Use keywords from the job description
3. Quantify achievements where possible
4. Keep to 1 page equivalent (~500 words)
5. Use clean, professional formatting

Return the resume as plain text with clear sections.
```

### 6.3 Cover Letter Generation Prompt

```
Write a compelling cover letter for this job application.

JOB:
Title: {{title}}
Company: {{company}}
Description: {{description}}

CANDIDATE:
Name: {{profile.full_name}}
Relevant Experience: {{relevantExperience}}

SCORING:
Key Strengths: {{strengths}}

Instructions:
1. Opening: Hook with specific interest in {{company}}
2. Body: Connect 2-3 key experiences to job requirements
3. Close: Clear call to action
4. Tone: Professional but personable
5. Length: 250-300 words

Return the cover letter as plain text.
```

---

## 7. API Reference

### 7.1 n8n Webhook

| Endpoint | Method | Auth | Payload |
|----------|--------|------|---------|
| `/webhook/job-intake` | POST | None | `{ jobUrl, source, submittedAt, requestId }` |

### 7.2 Supabase Queries (from v0)

```typescript
// Get all jobs
const { data } = await supabase
  .from('jobs')
  .select('*')
  .order('created_at', { ascending: false })

// Get job by ID
const { data } = await supabase
  .from('jobs')
  .select('*')
  .eq('id', jobId)
  .single()

// Get processing events
const { data } = await supabase
  .from('processing_events')
  .select('*')
  .eq('job_id', jobId)
  .order('created_at', { ascending: true })

// Update job status
const { error } = await supabase
  .from('jobs')
  .update({ status: 'applied', applied_at: new Date().toISOString() })
  .eq('id', jobId)
```

---

## 8. Testing Checklist

### 8.1 End-to-End Flow

- [ ] Submit URL from v0 UI
- [ ] n8n webhook receives payload
- [ ] Job inserted into Supabase with status='submitted'
- [ ] Page fetched successfully
- [ ] Job parsed (check title, company populated)
- [ ] Score calculated
- [ ] Documents generated (if score >= threshold)
- [ ] Job status = 'ready'
- [ ] v0 UI shows job with score and materials
- [ ] "Apply Now" opens source URL

### 8.2 Error Cases

- [ ] Invalid URL → Error shown in UI
- [ ] Duplicate URL → Message shown, existing job linked
- [ ] Fetch failure → Job shows error state with retry option
- [ ] Parse failure → Job shows partial state
- [ ] Below threshold → Job shows but no documents generated

---

## 9. Deployment

### 9.1 v0/Vercel

- Push to `v0/rsemeah-*` branch
- Auto-deploys to Vercel
- Supabase integration auto-configured

### 9.2 n8n

- Workflow hosted at redlanternstudios.app.n8n.cloud
- Webhook URL: `https://redlanternstudios.app.n8n.cloud/webhook/job-intake`
- Groq API key configured in n8n credentials

### 9.3 Supabase

- Project: endovljmaudnxdzdapmf
- Region: (check dashboard)
- RLS: Disabled (single-user app)

---

## 10. Future Roadmap

1. **Phase 1 (Current):** Manual URL paste → n8n process → Display
2. **Phase 2:** Browser extension for one-click capture
3. **Phase 3:** Direct API apply (Greenhouse, Lever)
4. **Phase 4:** Email integration for application tracking
5. **Phase 5:** Interview scheduling and prep

---

*Last updated: 2026-03-25*
