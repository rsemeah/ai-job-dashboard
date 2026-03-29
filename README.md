# HireWire

HireWire is an AI-assisted job application engine.

It helps users:
- analyze a job URL
- score fit against their profile
- generate a targeted resume and cover letter with evidence provenance
- generate interview prep (STAR stories and angle cards)
- track pipeline status from intake to apply/interview/outcome

## Tech Stack

- Next.js (App Router, TypeScript)
- Supabase (Auth, Postgres, Storage)
- Groq + Vercel AI SDK
- Tailwind + shadcn/ui
- pnpm

## Architecture At A Glance

There is no n8n dependency. Orchestration runs inside in-app API routes:

1. Browser submits URL to `POST /api/analyze`
2. Analysis writes initial job records to Supabase
3. In-process orchestrator triggers document generation and interview prep
4. UI polls/refreshes status and renders generated outputs

For full architecture details, see [ARCHITECTURE.md](ARCHITECTURE.md).

## Quick Start

### 1. Install

```bash
pnpm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Fill in `.env.local` with real values for:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GROQ_API_KEY`

### 3. Apply database migrations

Apply scripts in order from `scripts/001` through `scripts/011`.

If using Supabase CLI:

```bash
supabase db push
```

### 4. Run locally

```bash
pnpm dev
```

Open http://localhost:3000.

## Required Services

1. Supabase project
2. Groq API key

Optional:
1. Supabase Storage bucket named `avatars` (for profile image upload)

## Key Routes

- `POST /api/analyze` - intake and initial analysis
- `POST /api/generate-documents` - resume/cover letter generation
- `POST /api/jobs/[id]/run-flow` - trigger generation for existing job
- `POST /api/jobs/[id]/interview-prep` - interview prep generation
- `GET /api/export/resume` - DOCX resume export
- `GET/POST /api/profile` - profile read/write

## Job Lifecycle

`queued -> analyzing -> analyzed -> generating -> ready`

Failure/review branches:
- `needs_review`
- `error`

Pipeline progression states:
- `applied`
- `interviewing`
- `offered`
- `rejected`
- `archived`

## Documentation

- [Setup Guide](docs/setup.md)
- [Architecture](ARCHITECTURE.md)
- [Gap Audit Prompts](docs/gap-audit-prompts.md)
- [Readiness Docs Pack](docs/readiness/README.md)

## Deployment

Deploy to Vercel with the same four required environment variables set in project settings.

For production readiness checks, run a smoke test:
1. Login + onboarding
2. Submit job URL
3. Confirm generation reaches `ready`
4. Export resume
5. Open logs and verify run ledger entries
