# HireWire Setup Guide

## Prerequisites

- Node.js 18+
- pnpm (or npm/yarn)
- Supabase project
- n8n instance (optional for local dev)

## Quick Start

```bash
# Clone and install
git clone <repo-url>
cd hirewire
pnpm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your values

# Run locally
pnpm dev
```

## Environment Variables

### Required

| Variable | Description | Where to get |
|----------|-------------|--------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Supabase Dashboard > Settings > API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | Supabase Dashboard > Settings > API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Supabase Dashboard > Settings > API |

### Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `N8N_JOB_INTAKE_WEBHOOK_URL` | n8n webhook for job intake | Test webhook URL |

## Database Setup

The database schema is managed via Supabase migrations. Tables:

- `jobs` - Job listings and processing state
- `user_profile` - Your resume/profile data
- `processing_events` - Workflow activity log
- `generated_documents` - AI-generated materials
- `profile_snapshots` - Profile versions for reproducibility

## n8n Workflow

HireWire sends job URLs to n8n for processing. The webhook receives:

```json
{
  "jobUrl": "https://...",
  "source": "hirewire",
  "submittedAt": "2024-01-01T00:00:00.000Z",
  "requestId": "uuid"
}
```

n8n should:
1. Fetch the job page
2. Parse title/company/description
3. Insert into Supabase `jobs` table
4. Return `{ "accepted": true, "request_id": "..." }`

## Vercel Deployment

1. Connect your GitHub repo to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy

The app will automatically use environment variables from Vercel.
