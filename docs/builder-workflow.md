# HireWire Builder Workflow — Supabase-Aligned Feature Development

Use this workflow whenever you're building new features in HireWire with v0, Cursor, or direct coding. This ensures your code stays aligned with the Supabase schema, auth model, and orchestration architecture.

## Pre-Coding Checklist

Before you ask v0 to generate code or write it yourself, answer these:

### 1. Feature Definition
- [ ] What user problem does this solve?
- [ ] Does it require new database tables/columns?
- [ ] Does it need to access user data?
- [ ] Does it trigger workflows (analysis, generation, export)?

### 2. Schema Assessment
- [ ] Which tables do I need to read or write?
- [ ] Are all necessary columns already present?
- [ ] Do I need to create a migration?
- [ ] Will this data be user-scoped (needs RLS)?

### 3. Auth & Security
- [ ] Will this feature access user-specific data?
- [ ] Do I need to enforce user_id filtering?
- [ ] Will this be a client-side operation or server API?
- [ ] Should this require verified email/profile completion?

### 4. Integration Points
- [ ] Does this touch the job lifecycle?
- [ ] Will it generate content (requires Groq)?
- [ ] Does it log to run_ledger?
- [ ] Will it call other API routes?

## Workflow: From Idea to Implementation

### Phase 1: Schema Design (Before Coding)

**If your feature requires new data:**

1. **List all fields** your feature needs to store
2. **Check if they fit in existing tables** (jobs, user_profile, evidence_library, etc.)
3. **If new table needed:**
   - Write a `.sql` migration file in `scripts/`
   - Include `user_id` column if multi-tenant
   - Include RLS policy
   - Increment migration number (e.g., `012_your_feature.sql`)

**If modifying existing table:**

1. Check if `user_id` column exists
2. Write an `ALTER TABLE` migration
3. Test in Supabase SQL before asking v0

**Example migration:**
```sql
-- scripts/012_add_interview_feedback.sql
CREATE TABLE IF NOT EXISTS interview_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  job_id UUID NOT NULL REFERENCES jobs(id),
  feedback_text TEXT,
  rating INT CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_interview_feedback_user_job ON interview_feedback(user_id, job_id);

ALTER TABLE interview_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_can_view_own_feedback" ON interview_feedback
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users_can_insert_own_feedback" ON interview_feedback
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_can_update_own_feedback" ON interview_feedback
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

### Phase 2: API Route Design (If Feature Requires One)

**For every new API route, decide:**

1. **Endpoint**: `/api/[feature]/route.ts` OR `/api/[resource]/[id]/[action]/route.ts`
2. **Method**: GET (read), POST (create/trigger), PUT/PATCH (update)
3. **Auth Check**: Extract `user.id` from session, verify request owns data
4. **Groq Call Needed**: If generating content, use Groq (NOT mock)
5. **Logging**: Always call `recordRunStep()` or insert to `run_ledger` on error

**Example minimal API route:**
```typescript
import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function POST(request: NextRequest) {
  try {
    // 1. Auth check
    const supabase = createServerClient({
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
      supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
      cookies,
    })

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 2. Parse request
    const body = await request.json()
    const { job_id, feedback } = body

    // 3. Validate ownership (example: job must belong to authenticated user)
    const { data: job } = await supabase
      .from("jobs")
      .select("id")
      .eq("id", job_id)
      .eq("user_id", user.id)
      .maybeSingle()

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 })
    }

    // 4. Do the work
    const { error } = await supabase
      .from("interview_feedback")
      .insert({
        user_id: user.id,
        job_id,
        feedback_text: feedback,
      })

    if (error) throw error

    // 5. Log success
    await supabase
      .from("run_ledger")
      .insert({
        user_id: user.id,
        job_id,
        step_name: "interview_feedback",
        status: "success",
        summary: "Feedback recorded",
      })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error:", error)
    
    // 6. Log error
    const supabase = createServerClient({
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
      supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
      cookies,
    })
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    await supabase
      .from("run_ledger")
      .insert({
        step_name: "interview_feedback",
        status: "error",
        summary: "Failed to record feedback",
        error_details: errorMessage,
      })

    return NextResponse.json(
      { error: "Failed to record feedback" },
      { status: 500 }
    )
  }
}
```

### Phase 3: Component & UI Design

**If building a client component:**

1. Always load from an API route (not directly from Supabase client key)
2. Use `useEffect` to fetch on mount or when dependencies change
3. Show loading/error states
4. For edits, `POST` to API route (let server handle auth)

**Example client component:**
```typescript
'use client'

import { useState, useEffect } from 'react'

export function JobFeedbackForm({ jobId }: { jobId: string }) {
  const [feedback, setFeedback] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/interview-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: jobId, feedback }),
      })

      if (!res.ok) {
        const { error } = await res.json()
        throw new Error(error || 'Failed to save feedback')
      }

      setFeedback('')
      // Optionally refresh parent data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <textarea
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        placeholder="Your interview feedback..."
      />
      {error && <p className="text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading || !feedback.trim()}
      >
        {loading ? 'Saving...' : 'Save Feedback'}
      </button>
    </form>
  )
}
```

### Phase 4: v0 Prompting (If Using v0)

**Copy this template and fill in the blanks:**

```
I'm building [FEATURE NAME] for HireWire, a job application engine.

**Business Goal:** [What does this feature do for users?]

**Technical Requirements:**
- Integrates with Supabase table(s): [list tables]
- Requires new columns: [yes/no, if yes what columns?]
- Requires Groq API calls: [yes/no, what model?]
- Requires logging to run_ledger: [yes/no]
- User-scoped data (needs auth check): [yes/no]

**Constraints:**
- All queries must filter by auth.uid() = user_id
- Column names are lowercase_with_underscores
- Job status values are: queued|analyzing|analyzed|generating|ready|needs_review|error|applied|interviewing|offered|rejected|archived
- user_profile.full_name (NOT name)
- Error handling must log to run_ledger

**Output:** [Component only / API route / Both]

**Acceptance Criteria:**
- [ ] Passes TypeScript strict mode
- [ ] Authenticates user and validates ownership
- [ ] Handles errors gracefully
- [ ] Includes loading/error states (for client components)
- [ ] Logs important steps to run_ledger

This follows HireWire architecture: in-app orchestration (no n8n), Groq-based generation, Supabase RLS for multi-tenancy.
```

## Common Patterns

### Reading User-Scoped Data
```typescript
const { data, error } = await supabase
  .from("jobs")
  .select("*")
  .eq("user_id", userId)
  .order("created_at", { ascending: false })
```

### Inserting with User Context
```typescript
const { data, error } = await supabase
  .from("evidence_library")
  .insert({
    user_id: userId,           // Always include
    job_id: jobId,
    category: "achievement",
    bullet_text: "Led project X",
  })
```

### Calling Groq from API Route
```typescript
import { generateText } from "ai"
import { groq } from "@ai-sdk/groq"

const result = await generateText({
  model: groq("llama-3.3-70b-versatile"),
  prompt: "Analyze this job description...",
  temperature: 0.7,
})
```

### Logging to run_ledger
```typescript
await supabase
  .from("run_ledger")
  .insert({
    user_id: userId,
    job_id: jobId,
    step_name: "analyze_job",
    status: "success",
    summary: "Job analysis complete",
  })
```

## Testing Checklist Before Commit

- [ ] Feature works with your Supabase project
- [ ] All auth checks in place (user_id filtering)
- [ ] Errors logged to run_ledger
- [ ] Handles missing optional data gracefully
- [ ] No hardcoded env vars or secrets
- [ ] Component has loading/error states
- [ ] Types are strict (no `any`)
- [ ] Migration file created if schema changed
- [ ] No references to n8n or deprecated features

## How to Ask for Help

If something doesn't work:

1. **Check migration status** — Are all scripts 001-011 applied in Supabase?
2. **Check user_id filtering** — Is your query filtering by authenticated user?
3. **Check Groq key** — Does GROQ_API_KEY exist in .env?
4. **Check table/column names** — Are they lowercase_with_underscores?
5. **Check run_ledger** — Did errors get logged? What do they say?

---

**Last Updated**: March 30, 2026  
**Architecture**: In-app API routes, no n8n  
**Database**: Supabase Postgres with RLS  
**AI Provider**: Groq (llama-3.3-70b for generation, llama-3.1-8b for quality checks)
