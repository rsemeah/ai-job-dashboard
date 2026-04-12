# HireWire v0 Alignment Prompt
## Canonical Contract for Every v0 Build Session

**Version**: 1.0.0
**Last Updated**: 2026-04-11

---

## Your Role

You are building features for HireWire, a job application intelligence product.
You are not a blank-slate AI. You are operating inside an established codebase
with live production contracts, a running Supabase database, active RLS policies,
and a specific AI SDK version. Every change you make must respect these contracts
or the build breaks.

Before writing any code, read this document fully. Do not assume anything not
stated here. If something is undefined, say so — do not invent a default.

---

## Mandatory Orientation: What This System Is

HireWire is a multi-step job application workflow:

```
Onboarding → Resume Upload → Job Add → Analyze → Evidence Match →
Coach → Ready Queue → Generate Documents → Red Team Review → Apply
```

Each step is gated. A job cannot advance to a later stage without the
prior stage producing real artifacts in the database. The readiness engine
in `lib/readiness.ts` is the single source of truth for workflow gates.
**No page or component may compute readiness locally.**

---

## The 10 Canonical Contracts You Must Never Break

### 1. Document Content Source of Truth
`jobs.generated_resume` and `jobs.generated_cover_letter` are the canonical
columns for all generated document content.

- `generate-documents/route.ts` writes to these columns.
- Every consumer (red-team page, ready queue, export routes, job detail) must
  read from these columns — not from the `generated_documents` relation.
- `generated_documents` is a secondary history/versioning table. It is NEVER
  populated by the generation path. Do not query it for content.

**The bug this prevents:** `generated_documents` always returns empty, so
any code that reads from it and overrides `jobs.*` values will null out
all generated content downstream.

### 2. AI SDK Pattern
This codebase uses Vercel AI SDK v6 with Anthropic via AI Gateway.

```typescript
// CORRECT
import { generateText, Output } from "ai"
import { CLAUDE_MODELS } from "@/lib/adapters/anthropic"

const result = await generateText({
  model: CLAUDE_MODELS.SONNET,
  output: Output.object({ schema: MyZodSchema }),
  prompt: "...",
})
const data = result.experimental_output

// FORBIDDEN — these patterns break the build
import { generateObject } from "ai"                    // ❌ does not exist in v6
import { anthropic } from "@ai-sdk/anthropic"          // ❌ use CLAUDE_MODELS instead
import { createGroq } from "@ai-sdk/groq"              // ❌ Groq is dead code
model: anthropic("claude-sonnet-4-20250514")           // ❌ wrong pattern
```

Model constants live in `lib/adapters/anthropic.ts`:
- `CLAUDE_MODELS.SONNET` — primary generation model
- `CLAUDE_MODELS.OPUS` — complex reasoning
- `CLAUDE_MODELS.HAIKU` — fast/simple tasks

### 3. Groq Is Dead
Groq has been fully removed from all active code paths. `lib/adapters/groq.ts`
and `lib/ai/service.ts` are dead files — do not import from them.
Do not add `GROQ_API_KEY` references. Do not add Groq fallbacks.
If you see a Groq comment in an existing file, update it to say Claude.

### 4. JSONB Array Safety
These Supabase columns can return `null`, `{}` (empty object), or a proper array.
Calling `.length` or `.map()` on them without a guard **crashes the page**.

Columns requiring `Array.isArray()` guards:
- `user_profile.links`
- `user_profile.education`
- `user_profile.experience`
- Any JSONB column you interact with that is expected to be an array

```typescript
// CORRECT
const links = Array.isArray(data.links) ? data.links : []
const education = Array.isArray(data.education) ? data.education : []

// FORBIDDEN — these crash when Supabase returns {}
const links = data.links || []       // ❌ {} is truthy, stays {}
profile.links.map(...)               // ❌ crashes if {} returned
```

### 5. Tenant Isolation — Mandatory Query Pattern
Every query touching user data must include both filters:

```typescript
.eq("user_id", user.id)     // ALWAYS — tenant isolation
.is("deleted_at", null)     // ALWAYS on jobs — soft delete filter
```

Never omit either. RLS is a backup, not a replacement for explicit filtering.

### 6. Auth Pattern
Use `lib/supabase/require-user.ts` for route auth:

```typescript
// API routes
import { requireUser } from "@/lib/supabase/require-user"
const { user, supabase } = await requireUser()

// Paid-only routes
import { requirePaidUser } from "@/lib/supabase/require-user"
const { user, supabase } = await requirePaidUser()
```

Do not implement custom auth checks inline in routes. The central helper
handles unauthorized redirect and error responses consistently.

### 7. Quality Pass Route
The canonical quality-pass endpoint is:
`app/api/jobs/[jobId]/quality-pass/route.ts`

- POST: approve (sets `quality_passed=true`, `quality_passed_at`, audit event)
- DELETE: revoke

The old route at `app/api/jobs/[id]/quality-pass/route.ts` has been deleted.
Do not recreate it. Do not add a competing route that writes `status: "ready"`.
Status is derived from artifacts by the readiness engine — never written directly
to gate a job into "ready".

### 8. Billing Contract
`lib/contracts/hirewire.ts` is the source of truth for all plan/subscription types.

```typescript
PlanType = "free" | "pro" | "enterprise"
```

The live DB `public.users` table uses these exact values.
Do not introduce `"monthly"`, `"lifetime"`, `"starter"`, or any other variant.
If you touch billing logic, check `lib/contracts/hirewire.ts` first.

### 9. SQL Migration Order for CHECK Constraints
When writing migrations that change a CHECK constraint:

```sql
-- CORRECT ORDER
ALTER TABLE jobs DROP CONSTRAINT jobs_status_check;  -- 1. Drop first
UPDATE jobs SET status = 'new_value' WHERE ...;      -- 2. Then update data
ALTER TABLE jobs ADD CONSTRAINT jobs_status_check    -- 3. Then add new constraint
  CHECK (status IN (...));
```

Never put UPDATE before DROP in the same migration script. Supabase executes
statements in order — the CHECK violation fires immediately.

### 10. Readiness Engine Is Sole Gate Authority
`lib/readiness.ts` exports:
- `evaluateJobReadiness(jobId, userId)` — per-job detail views
- `getReadyJobIds(userId)` — list views (ready queue)

No page, component, or API route may compute its own readiness logic.
No component may locally derive whether a job "can generate" or "can apply".
Call the readiness engine. Trust its output.

---

## Live Schema Quick Reference

### Tables You Will Touch Most

| Table | Critical Columns | Always Filter |
|---|---|---|
| `jobs` | `generated_resume`, `generated_cover_letter`, `quality_passed`, `evidence_map`, `deleted_at` | `user_id` + `deleted_at IS NULL` |
| `user_profile` | `links(jsonb)`, `education(jsonb)`, `experience(jsonb)`, `skills[]` | `user_id` |
| `job_analyses` | `qualifications_required`, `qualifications_preferred`, `keywords` | `user_id` |
| `job_scores` | `overall_score`, `skills_match`, `experience_relevance` | via jobs RLS subquery |
| `evidence_library` | `source_type`, `outcomes[]`, `tools_used[]`, `is_active` | `user_id` |
| `audit_events` | `event_type`, `outcome`, `metadata(jsonb)` | `user_id` |

### Tables That Are Read-Only for Most Features
- `companies` — lookup only unless explicitly managing companies
- `source_resumes` — written by resume upload route only
- `generated_documents` — do not write to this; do not read content from it

### Deprecated — Never Query
- `jobs_deprecated`, `profiles_deprecated`, `profiles`

---

## PostHog Funnel Events — All 6 Must Fire

Import from `@/lib/analytics`:

```typescript
import {
  trackJobAdded,           // Stage 1: job added to pipeline
  trackJobAnalyzed,        // Stage 2: analysis complete
  trackEvidenceMatchCompleted, // Stage 3: evidence matching done
  trackDocumentsGenerated, // Stage 4: resume + cover letter generated
  trackQualityPassed,      // Stage 5: red team approved
  trackApplied,            // Stage 6: user applied
} from "@/lib/analytics"
```

These must fire on every code path where the event occurs — including
the ready-queue's Mark Applied path, not just job-detail.
Do not add a new tracking function that calls `posthog.capture()` directly —
always go through `@/lib/analytics`.

---

## Sentry Error Capture

API routes must capture errors to Sentry in their catch blocks:

```typescript
} catch (error) {
  const { captureError } = await import("@/lib/sentry")
  captureError(error instanceof Error ? error : new Error(String(error)), {
    tags: { route: "your-route-name" },
  })
  return NextResponse.json({ success: false, error: "..." }, { status: 500 })
}
```

---

## What v0 Must Do Before Submitting Any PR

### 1. Reality Check — Ask These Questions
- Does my code read document content from `jobs.generated_resume` (not `generated_documents`)?
- Do I have `Array.isArray()` guards on every JSONB column I'm mapping?
- Am I using `generateText + Output.object()` not `generateObject`?
- Did I include `user_id` and `deleted_at` filters on every jobs query?
- Am I using `CLAUDE_MODELS.SONNET` not a raw model string?
- Did any Groq reference slip in?
- Did I add a route that competes with `[jobId]/quality-pass`?
- Am I computing readiness locally instead of calling `lib/readiness.ts`?

### 2. Wiring Check
- Every new page has a route in `app/`
- Every new API route has `requireUser()` at the top
- Every new client component with events has PostHog tracking
- Every new server action has a try/catch with Sentry capture

### 3. State and Truth Check
- New data state reads from DB, not from stale client state
- Loading, empty, and error states are all handled
- No fake success messages — only confirm what actually happened in the DB

---

## What v0 Must Never Do

| Forbidden Action | Why |
|---|---|
| Import from `@ai-sdk/groq` or `lib/adapters/groq` | Groq removed; breaks imports |
| Use `generateObject()` | Does not exist in AI SDK v6 |
| Read content from `generated_documents` relation | Always empty; nulls downstream |
| Override `jobs.generated_resume` with null from dead relation | Breaks entire review spine |
| Write `status: "ready"` to gate quality approval | Readiness is derived, not written |
| Create a second quality-pass route under `[id]/` | Duplicate with conflicting logic |
| Call `.map()` on JSONB without `Array.isArray()` guard | Crashes on `{}` return |
| Use `data.links || []` pattern for JSONB arrays | `{}` is truthy, .map() still crashes |
| Add billing plan values not in `lib/contracts/hirewire.ts` | DB constraint violation |
| Query without `user_id` filter | Tenant isolation failure |
| Query jobs without `deleted_at IS NULL` | Returns soft-deleted records |

---

## File Ownership — Do Not Modify Without Understanding These

| File | What It Does | Risk If Mishandled |
|---|---|---|
| `lib/readiness.ts` | Sole workflow gate authority | Breaking gates breaks entire workflow |
| `lib/actions/jobs.ts` | Core data access layer | `getJobById` null-override bug was catastrophic |
| `app/api/generate-documents/route.ts` | Core generation path | Writes canonical columns; catch block must not write nonexistent columns |
| `app/api/jobs/[jobId]/quality-pass/route.ts` | Canonical approve/revoke | Only quality-pass route that should exist |
| `lib/contracts/hirewire.ts` | Billing type source of truth | Diverging from this breaks DB constraints |
| `lib/adapters/anthropic.ts` | Model constant definitions | Changing model IDs breaks all AI routes |
| `components/posthog-provider.tsx` | PostHog initialization + user identity | Wraps the entire app; changes affect all events |

---

## Current Spine Status (as of 2026-04-11)

All stages of the workflow spine are wired and unblocked:

| Stage | Route/Page | Status |
|---|---|---|
| Job Add + Analyze | `components/dashboard-content.tsx` + `/api/analyze` | ✅ |
| Evidence Match | `/jobs/[id]/evidence-match` | ✅ |
| Generate Documents | `/api/generate-documents` | ✅ |
| Red Team Review | `/jobs/[id]/red-team` | ✅ |
| Quality Approve | `/api/jobs/[jobId]/quality-pass` | ✅ |
| Ready Queue | `/ready-queue` | ✅ |
| Apply | `ready-job-actions.tsx` + `job-detail.tsx` | ✅ |

All 6 PostHog funnel events are wired. Sentry capture is wired on
`analyze` and `generate-documents`. `lib/analytics.ts`, `lib/audit.ts`,
and `app/providers/posthog-provider.tsx` are all on remote.

---

## When You Are Unsure

State it explicitly. Do not silently fill gaps. Label your uncertainty as:
- **DEFINED** — explicitly confirmed in this document or the codebase
- **ASSUMED** — reasonable inference not yet verified
- **MISSING** — required but not yet defined
- **RISKY** — defined but fragile or likely to break

Prefer a working, honest build over a polished, broken one.

---

## Build Philosophy for HireWire

1. **Correctness before elegance.** If it's elegant but wrong, it ships broken.
2. **No fake completeness.** A spinner is not a feature. A mock is not a capability.
3. **Single source of truth per domain.** One canonical column, one canonical route, one canonical lib.
4. **Fail loudly, fail safely.** Errors surface to Sentry. Users see recoverable messages.
5. **Tenant safety is non-negotiable.** Every query is scoped. Every write is owned.
6. **The spine must stay unbroken.** Generate → Review → Approve → Ready → Apply.
   Any change that nulls, bypasses, or short-circuits this flow is a regression.
