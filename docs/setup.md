# HireWire Setup Guide

## Prerequisites

- Node.js 18+
- pnpm
- Supabase project
- Groq API key (free tier sufficient for development)

## Quick Start

```bash
# Clone and install
git clone <repo-url>
cd hirewire
pnpm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your values (see Environment Variables below)

# Run locally
pnpm dev
```

## Environment Variables

### Required

| Variable | Description | Where to get |
|----------|-------------|--------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key | Supabase Dashboard → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) | Supabase Dashboard → Settings → API |
| `GROQ_API_KEY` | Groq API key for all AI operations | [console.groq.com](https://console.groq.com) |

> **Note**: There is no n8n dependency. All orchestration runs inside Next.js API routes.

## Database Setup

Run migration scripts in order from `scripts/` (001 → 011). Each script must succeed before running the next.

```bash
# Apply migrations via Supabase dashboard SQL editor, or using the Supabase CLI:
supabase db push
```

### Tables created by migrations

| Table | Purpose |
|---|---|
| `jobs` | Job listings, status, scores, generated resume + cover letter |
| `user_profile` | Resume data — note: uses `full_name` column, not `name` |
| `evidence_library` | Extracted resume bullet provenance per job |
| `job_analyses` | Raw Groq analysis output per job |
| `interview_prep` | STAR stories and angles per job |
| `run_ledger` | Per-step observability log (created by script 009) |
| `processing_events` | Legacy activity log (retained for compatibility) |

> **Important**: `user_profile` uses `full_name` (not `name`). If you see auth callback failures or generation errors mentioning `full_name`, check that your migration script 002 has been applied correctly and that the column is named `full_name`.

## Supabase Storage

Create an `avatars` bucket in the Supabase Storage dashboard if you want avatar upload to work on the Profile page. The app handles a missing bucket gracefully (silently skips upload) — this is optional.

## Supabase Auth

In the Supabase Auth dashboard:
1. Enable **Google OAuth** provider (if using Google sign-in) — add your OAuth credentials
2. Enable **Email (magic link)** provider
3. Set the **Site URL** to your deployment URL (e.g. `https://your-app.vercel.app`)
4. Add `https://your-app.vercel.app/auth/callback` to **Redirect URLs**

## Vercel Deployment

1. Connect your GitHub repo to Vercel
2. Add all four required environment variables in Vercel Dashboard → Settings → Environment Variables
3. Deploy — no additional build configuration needed

The `VERCEL_URL` environment variable is set automatically by Vercel and is used by the in-app orchestrator to construct internal API URLs. No manual configuration is needed for this.
