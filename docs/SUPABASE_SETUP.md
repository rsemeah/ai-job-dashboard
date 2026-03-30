# HireWire Supabase Setup & Verification

## Current Status: COMPLETE

All required tables exist with proper RLS policies. No additional Supabase configuration needed for V1 launch.

---

## Database Schema Verification

### Core HireWire Tables (All Exist)

| Table | RLS | Policies | Status |
|-------|-----|----------|--------|
| `jobs` | Enabled | 4 (CRUD) | READY |
| `job_analyses` | Enabled | 4 (CRUD) | READY |
| `evidence_library` | Enabled | 4 (CRUD) | READY |
| `user_profile` | Enabled | 4 (CRUD) | READY |
| `generated_documents` | Enabled | 4 (CRUD) | READY |
| `interview_prep` | Enabled | 4 (CRUD) | READY |
| `interview_bank` | Enabled | 4 (CRUD) | READY |
| `generation_quality_checks` | Enabled | 2 (SELECT, INSERT) | READY |
| `processing_events` | Enabled | 2 (SELECT, INSERT) | READY |
| `profile_snapshots` | Enabled | 2 (SELECT, INSERT) | READY |
| `run_ledger` | Enabled | 2 (SELECT, INSERT) | READY |
| `silent_engine_logs` | Enabled | 2 (SELECT, INSERT) | READY |
| `companion_conversations` | Enabled | 6 | READY |
| `companion_messages` | Enabled | 2 (SELECT, INSERT) | READY |
| `resumes` | Enabled | 4 (CRUD) | READY |
| `profile_insights` | Enabled | 3 | READY |

### Environment Variables (All Set)

```
SUPABASE_URL              
NEXT_PUBLIC_SUPABASE_URL  
SUPABASE_ANON_KEY         
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY 
SUPABASE_JWT_SECRET       
POSTGRES_URL              
POSTGRES_HOST             
POSTGRES_USER             
POSTGRES_PASSWORD         
POSTGRES_DATABASE         
```

---

## What's Already Done

### 1. Authentication
- Supabase Auth configured via environment variables
- Auth callback route exists at `/app/auth/callback/route.ts`
- Login/Register pages use `@supabase/ssr` correctly
- Middleware protects dashboard routes

### 2. Row Level Security (RLS)
All tables have RLS enabled with `user_id` filtering:

```sql
-- Example policy pattern (already applied to all tables)
CREATE POLICY "users_select_own" ON table_name
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users_insert_own" ON table_name
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_update_own" ON table_name
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "users_delete_own" ON table_name
  FOR DELETE USING (auth.uid() = user_id);
```

### 3. Storage Buckets
- `avatars` bucket exists for profile images (if using avatar uploads)

---

## NO ACTION REQUIRED

The following are already complete:

1. All 16+ HireWire tables created
2. RLS enabled on all tables
3. CRUD policies applied
4. Environment variables configured
5. Auth flow working
6. Server/client Supabase utilities exist in `/lib/supabase/`

---

## Optional: Verify in Supabase Dashboard

If you want to manually verify, check these in your Supabase Dashboard:

### 1. Table Editor
Navigate to **Table Editor** and confirm these tables exist:
- `jobs`
- `job_analyses`
- `evidence_library`
- `user_profile`
- `generated_documents`
- `interview_prep`
- `companion_conversations`
- `companion_messages`

### 2. Authentication > Policies
Navigate to **Authentication > Policies** and confirm:
- Each table shows "RLS Enabled"
- Each table has at least 2-4 policies

### 3. Authentication > Users
Navigate to **Authentication > Users** and:
- Create a test user if none exists
- Verify email confirmation is disabled for testing (optional)

### 4. Project Settings > API
Confirm these match your environment variables:
- Project URL = `SUPABASE_URL`
- Anon Key = `SUPABASE_ANON_KEY`
- Service Role Key = `SUPABASE_SERVICE_ROLE_KEY`

---

## Troubleshooting

### "Permission denied" errors
1. Check RLS policies exist for the table
2. Verify `user_id` column matches `auth.uid()`
3. Use `createAdminClient()` for service operations (bypasses RLS)

### "Table not found" errors
1. Run any missing migration scripts from `/scripts/`
2. Check you're connected to the correct Supabase project

### Auth not working
1. Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set
2. Check auth callback route exists at `/app/auth/callback/route.ts`
3. Verify email provider is configured in Supabase Dashboard

---

## Scripts Already Executed

These migration scripts have been run (no need to re-run):

```
scripts/001_create_evidence_library.sql
scripts/002-create-profile-table.sql
scripts/002_truthserum_evidence_library.sql
scripts/003_seed_ro_evidence.sql
scripts/004_fix_jobs_rls.sql
scripts/005_create_interview_prep.sql
scripts/006_add_generation_status.sql
scripts/007_add_user_id_to_tables.sql
scripts/add-avatar-url-to-profile.sql
scripts/create-avatars-bucket.sql
```

---

## Summary

**Supabase is fully configured for HireWire V1.**

No additional database setup, migrations, or configuration is required. All tables, policies, and environment variables are in place.

Focus remaining effort on:
1. Code convergence tasks (see V1_EXECUTION_HANDOFF.md)
2. End-to-end testing
3. Bug fixes

---

**Document Generated:** March 30, 2026
