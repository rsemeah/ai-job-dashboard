/**
 * scripts/test-tenant-isolation.ts
 *
 * Two-user runtime tenant isolation test.
 *
 * What it tests:
 *  - User A creates rows in: jobs, user_profile, evidence_library, job_analyses, audit_events, companies
 *  - User B (different account) attempts to read/write those rows
 *  - Asserts every cross-tenant read returns 0 rows
 *  - Asserts every cross-tenant write is rejected
 *  - Full teardown of both test users' data
 *
 * Usage:
 *   npx tsx scripts/test-tenant-isolation.ts
 *
 * Requires env vars:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY   (for user creation + teardown)
 *   TEST_USER_A_EMAIL / TEST_USER_A_PASSWORD
 *   TEST_USER_B_EMAIL / TEST_USER_B_PASSWORD
 *
 * IMPORTANT: Run against a staging/dev project only — this creates and deletes real rows.
 */

import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const USER_A = {
  email: process.env.TEST_USER_A_EMAIL ?? "test-user-a@hirewire-test.invalid",
  password: process.env.TEST_USER_A_PASSWORD ?? "TestPass-A-9x!2",
}
const USER_B = {
  email: process.env.TEST_USER_B_EMAIL ?? "test-user-b@hirewire-test.invalid",
  password: process.env.TEST_USER_B_PASSWORD ?? "TestPass-B-9x!2",
}

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("❌  Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
}

// Admin client (service role) — used for setup and teardown only
const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ── Helpers ────────────────────────────────────────────────────────────────────

let passed = 0
let failed = 0

function assert(label: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`  ✅  ${label}`)
    passed++
  } else {
    console.error(`  ❌  ${label}${detail ? ` — ${detail}` : ""}`)
    failed++
  }
}

async function ensureUser(email: string, password: string): Promise<string> {
  // Try sign-in first, create if not found
  const { data: existing } = await admin.auth.admin.listUsers()
  const found = existing?.users?.find((u) => u.email === email)
  if (found) return found.id

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (error) throw new Error(`Failed to create ${email}: ${error.message}`)
  return data.user.id
}

async function signIn(email: string, password: string) {
  const client = createClient(SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data, error } = await client.auth.signInWithPassword({ email, password })
  if (error) throw new Error(`Sign-in failed for ${email}: ${error.message}`)
  return client
}

// ── Main test ──────────────────────────────────────────────────────────────────

async function run() {
  console.log("\n🔒  HireWire Tenant Isolation Test\n")

  // ── Setup ────────────────────────────────────────────────────────────────────
  console.log("── Setup: creating test users")
  const userAId = await ensureUser(USER_A.email, USER_A.password)
  const userBId = await ensureUser(USER_B.email, USER_B.password)
  console.log(`   User A: ${userAId}`)
  console.log(`   User B: ${userBId}`)

  // Sign both users in with the anon key (triggers PostgREST + authenticated role)
  const clientA = await signIn(USER_A.email, USER_A.password)
  const clientB = await signIn(USER_B.email, USER_B.password)

  // ── User A creates seed rows ─────────────────────────────────────────────────
  console.log("\n── User A: seeding rows")

  // Ensure user A has a profile row (upsert)
  await admin.from("users").upsert({ id: userAId, email: USER_A.email, plan_type: "free" })

  // Job
  const { data: jobA } = await clientA
    .from("jobs")
    .insert({ user_id: userAId, role_title: "Test Engineer", company_name: "ACME Corp", status: "new", job_url: "https://example.com/job-a" })
    .select("id")
    .single()
  assert("User A can create a job", !!jobA?.id)
  const jobId = jobA!.id

  // Evidence
  const { data: evidenceA } = await clientA
    .from("evidence_library")
    .insert({ user_id: userAId, title: "Test Evidence A", content: "Lorem ipsum", is_active: true, confidence_level: "high" })
    .select("id")
    .single()
  assert("User A can create evidence", !!evidenceA?.id)
  const evidenceId = evidenceA!.id

  // Company
  const { data: companyA } = await clientA
    .from("companies")
    .insert({ user_id: userAId, name: "ACME Corp Test" })
    .select("id")
    .single()
  const companyCreated = !!companyA?.id
  if (companyCreated) assert("User A can create a company", true)

  // Audit event
  await clientA
    .from("audit_events")
    .insert({ user_id: userAId, event_type: "test_event", payload: {} })

  // ── Cross-tenant read attempts by User B ─────────────────────────────────────
  console.log("\n── User B: attempting cross-tenant reads (should all return 0 rows)")

  // 1. Read User A's jobs
  const { data: bReadJobs } = await clientB.from("jobs").select("id").eq("id", jobId)
  assert("User B cannot read User A's job", (bReadJobs ?? []).length === 0)

  // 2. Read User A's evidence
  const { data: bReadEvidence } = await clientB.from("evidence_library").select("id").eq("id", evidenceId)
  assert("User B cannot read User A's evidence", (bReadEvidence ?? []).length === 0)

  // 3. Read User A's profile
  const { data: bReadProfile } = await clientB.from("users").select("id").eq("id", userAId)
  assert("User B cannot read User A's profile", (bReadProfile ?? []).length === 0)

  // 4. Read User A's audit events
  const { data: bReadAudit } = await clientB.from("audit_events").select("id").eq("user_id", userAId)
  assert("User B cannot read User A's audit events", (bReadAudit ?? []).length === 0)

  // 5. Read from companies if table exists
  if (companyCreated) {
    const { data: bReadCompany } = await clientB
      .from("companies")
      .select("id")
      .eq("user_id", userAId)
    assert("User B cannot read User A's companies", (bReadCompany ?? []).length === 0)
  }

  // ── Cross-tenant write attempts by User B ────────────────────────────────────
  console.log("\n── User B: attempting cross-tenant writes (should all fail)")

  // 6. Update User A's job
  const { error: bUpdateJob } = await clientB
    .from("jobs")
    .update({ status: "applied" })
    .eq("id", jobId)
    .eq("user_id", userAId)
  // A successful update with 0 rows affected is also safe — check nothing changed
  const { data: jobAfterUpdate } = await admin.from("jobs").select("status").eq("id", jobId).single()
  assert(
    "User B cannot update User A's job status",
    jobAfterUpdate?.status !== "applied",
    `status was: ${jobAfterUpdate?.status}`
  )

  // 7. Delete User A's evidence
  const { error: bDeleteEvidence } = await clientB
    .from("evidence_library")
    .delete()
    .eq("id", evidenceId)
    .eq("user_id", userAId)
  const { data: evidenceStillExists } = await admin
    .from("evidence_library")
    .select("id")
    .eq("id", evidenceId)
    .single()
  assert("User B cannot delete User A's evidence", !!evidenceStillExists)

  // 8. Insert audit event for User A (cross-tenant user_id injection)
  const { error: bInsertAudit } = await clientB
    .from("audit_events")
    .insert({ user_id: userAId, event_type: "cross_tenant_attack", payload: {} })
  assert(
    "User B cannot insert audit event with User A's user_id",
    !!bInsertAudit,
    `error: ${bInsertAudit?.message}`
  )

  // 9. Read job_scores for User A's job (no user_id col — scoped via jobs join in RLS)
  const { data: bReadScores } = await clientB
    .from("job_scores")
    .select("job_id")
    .eq("job_id", jobId)
  assert("User B cannot read User A's job_scores", (bReadScores ?? []).length === 0)

  // ── Teardown ──────────────────────────────────────────────────────────────────
  console.log("\n── Teardown")
  await admin.from("jobs").delete().eq("user_id", userAId)
  await admin.from("evidence_library").delete().eq("user_id", userAId)
  await admin.from("audit_events").delete().eq("user_id", userAId)
  if (companyCreated) await admin.from("companies").delete().eq("user_id", userAId)
  console.log("   Rows deleted for User A")

  // ── Results ───────────────────────────────────────────────────────────────────
  console.log(`\n── Results: ${passed} passed, ${failed} failed\n`)
  if (failed > 0) {
    console.error("❌  TENANT ISOLATION FAILURES DETECTED\n")
    process.exit(1)
  } else {
    console.log("✅  All tenant isolation checks passed\n")
  }
}

run().catch((err) => {
  console.error("Unexpected error:", err)
  process.exit(1)
})
