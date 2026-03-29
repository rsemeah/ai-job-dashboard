# HireWire Gap Audit Prompts

Copy and paste these prompts directly into GitHub Codespaces (or any Codex/AI chat session with repo access).
Run Prompt 1 first; run Prompt 2 immediately after Prompt 1 finishes.

---

> **Before you run these prompts, decide one thing:**
>
> - **Option A — n8n stays as the long-term orchestrator.** The audit should flag gaps in the n8n workflow (webhook reliability, data mapping, retries) as launch blockers, and in-app AI routes should be treated as a fallback only.
> - **Option B — In-app orchestration replaces n8n.** The audit should treat the Next.js API routes (`/api/analyze`, `/api/generate-documents`, etc.) as the primary path and flag any remaining n8n coupling as tech debt to remove.
>
> Add your choice as a sentence at the top of Prompt 1 before pasting, or let Codespaces answer based on what it finds in the repo.

---

## Prompt 1 — TruthSerum Gap Audit (original version)

```text
You are performing a TruthSerum style product gap audit for HireWireInGroup.

Do not flatter.
Do not assume.
Do not treat polished UI as completed product.
Do not give vague product advice.
Audit the repo like a senior product architect, technical PM, and launch auditor.

CONTEXT

HireWire is intended to be an AI Career Operating System.
Its job is not just to look good.
It must actually help a real user:

1. onboard quickly
2. build a strong private profile
3. ingest their resume, LinkedIn, GitHub, websites, and other evidence
4. analyze jobs
5. score fit
6. generate strong resumes and cover letters
7. improve those documents before export
8. prep the user for interviews
9. keep everything account scoped and private
10. move the user from confusion to ready-to-apply

CRITICAL USER CONCERN

I have not had a real chance to inspect or validate the onboarding journey.
That is a major concern because onboarding is make or break for this product.

The onboarding must be:
- comprehensive enough to capture the essence of the user
- easy enough that it does not overwhelm or create abandonment
- structured enough that downstream resume generation and cover letter generation are actually strong
- progressive enough that users are not hit with a giant form wall
- private and account scoped
- reliable across uploads, edits, and future profile updates

If onboarding is weak, the solution is weak.
If profile capture is weak, resume and cover letter generation will be weak.
Treat this as a top priority in the audit.

YOUR TASK

Audit the current HireWire repo and identify all major gaps between:
A. what is currently real
and
B. the product we actually need

Return a brutally honest launch gap report.

PART 1 — PRODUCT REALITY AUDIT

For every major area below, determine:
- what is already real and verified in code
- what is partial
- what is fake, placeholder, or cosmetic
- what is missing
- what is risky for launch

Audit these areas:

1. Authentication and session handling
2. User account isolation and privacy
3. Onboarding flow
4. Profile ingestion and profile completeness
5. Resume upload and parsing
6. LinkedIn, GitHub, website, and external source ingestion
7. Conversational profile editing and profile updates
8. Job intake and job parsing
9. Fit scoring and evidence mapping
10. Resume generation
11. Cover letter generation
12. Quality review and issue detection
13. Auto augmentation and document improvement before export
14. Export and download readiness
15. Ready to Apply workflow
16. Interview prep
17. Templates and prompt rules
18. Analytics and activity tracking
19. Empty states and no-data handling
20. Error handling and retries
21. Placeholder leakage and invalid data rendering
22. Dashboard usefulness for a first time user
23. Mobile or responsive readiness if present
24. Launch readiness overall

PART 2 — ONBOARDING DEEP AUDIT

This is the highest priority section.

Inspect every file, route, component, schema, action, and API related to onboarding, profile creation, profile editing, or user data capture.

Determine:

1. What is the actual first time user flow right now
2. What happens immediately after sign up or login
3. Whether a user is clearly guided into onboarding
4. Whether onboarding is currently too shallow, too manual, too fragmented, or too heavy
5. What user information is actually collected
6. What important information is not collected but should be
7. Whether uploads are supported
8. Whether pasted resume text is supported
9. Whether LinkedIn, GitHub, websites, and other source types are truly supported
10. Whether users can skip and come back later
11. Whether onboarding progress is saved
12. Whether onboarding data is actually used downstream in resume and cover letter generation
13. Whether the profile model is rich enough to produce strong documents
14. Whether the user can refine or update profile data later without manually redoing everything
15. Whether onboarding is launch worthy right now

Then answer this clearly:

Can the current onboarding reliably capture the essence of a user well enough to power excellent resume generation and cover letter generation?

Answer yes or no first.
Then explain why.

PART 3 — DOWNSTREAM DOCUMENT QUALITY AUDIT

Audit whether HireWire currently has enough real user data and system logic to produce:

- strong tailored resumes
- strong tailored cover letters
- tangible project references
- credible experience bullets
- personalized summaries
- non-generic phrasing
- ATS-aware outputs
- export-ready outputs

Specifically inspect whether the system can:
- use profile facts
- use project names
- use company names
- use external links or repos
- use evidence from uploaded documents
- detect weak bullets
- suggest or apply stronger improvements
- avoid generic AI sounding language
- avoid unsupported claims
- avoid placeholder content
- avoid weak copy-paste formatting

Then answer:

What is currently preventing HireWire from generating the best possible resume and cover letter for a real user?

PART 4 — GAP CLASSIFICATION

Group all identified gaps into these categories:

1. Launch blockers
2. Core workflow weaknesses
3. Onboarding weaknesses
4. Data model weaknesses
5. UX weaknesses
6. Trust and privacy risks
7. Output quality risks
8. Cosmetic only issues
9. Nice to have later

PART 5 — FEATURE BY FEATURE TRUTH TABLE

Create a table with columns:

- Feature Area
- Real Now
- Partial Now
- Missing Now
- Launch Risk
- Recommended Fix First

Use simple, unambiguous language.

PART 6 — RECOMMENDED TARGET STATE

Based on the current repo and the intended product, define what the ideal HireWire user journey should be:

1. First visit
2. Sign up or login
3. Onboarding
4. Profile strengthening
5. Job intake
6. Fit analysis
7. Resume and cover generation
8. Quality repair
9. Interview prep
10. Ready to Apply
11. Ongoing usage

Make this target state specific, realistic, and aligned with the current product direction.

PART 7 — PRIORITIZED FIX ORDER

Provide the exact order HireWire should be finished in from this point forward.

Do not prioritize cosmetics ahead of core function.

Give me:

- Top 10 highest value fixes in order
- Why each matters
- What each unlocks
- Whether it is a launch blocker

PART 8 — FILE LEVEL INVESTIGATION

For each major gap, identify the actual files, routes, and components involved.

Return:

- file path
- what it currently does
- what the issue is
- what must change

Do not stay high level.
I want file grounded findings.

PART 9 — PLACEHOLDER AND FAKE STATE SWEEP

Search the repo for:
- placeholder
- mock
- dummy
- temp
- fallback
- lorem
- __PLACEHOLDER__
- fake values rendered to UI
- hardcoded demo values

Identify every place where fake or invalid data may still leak into the user experience.

PART 10 — FINAL VERDICT

End with 5 blunt sections:

1. What HireWire already does well
2. What is giving a false sense of progress
3. What is most dangerous to launch without fixing
4. Whether onboarding is strong enough today
5. Whether this product is actually close to launch or still structurally incomplete

RESPONSE FORMAT

Return in this exact format:

# HireWire Gap Audit

## Executive Summary
## What Is Real Today
## What Is Not Real Yet
## Onboarding Deep Audit
## Document Generation Readiness
## Launch Blockers
## Gap Table
## File Level Findings
## Priority Fix Order
## Final Verdict

STRICT RULES

- No motivational language
- No startup fluff
- No generic "looks good overall"
- No assumptions without code evidence
- No treating UI as proof of working product
- If something is unknown, say unknown
- If something is fake, say fake
- If something is partial, say partial
- If something is dangerous, say dangerous

This is a truth audit, not a design critique.
```

---

## Prompt 2 — Execution Plan (original version)

```text
Now turn the gap audit into an execution plan.

Return only:
1. The top 3 launch blockers
2. The top 3 onboarding fixes
3. The top 3 document quality fixes
4. The exact file-by-file implementation order
5. The exact acceptance criteria for each fix

No extra commentary.
```

---

## Prompt 1 (Codex-ready) — TruthSerum Gap Audit — HireWireInGroup

Tighter version optimized for repo scanning and file-grounded output. Use this if the original produces too much narrative and not enough file references.

```text
You are performing a TruthSerum style product gap audit for the repo: rsemeah/HireWireInGroup.

Non-negotiables:
- Do not flatter.
- Do not assume.
- Do not treat polished UI as completed product.
- No vague product advice.
- Every claim must be grounded in code evidence with file paths.
- If unknown, say unknown. If fake, say fake. If partial, say partial. If dangerous, say dangerous.

CONTEXT
HireWire is intended to be an AI Career Operating System. It must help a real user:
1) onboard quickly
2) build a strong private profile
3) ingest resume/LinkedIn/GitHub/websites/evidence
4) analyze jobs
5) score fit
6) generate strong resumes + cover letters
7) improve docs before export
8) prep for interviews
9) keep everything account-scoped + private
10) move user from confusion → ready-to-apply

CRITICAL PRIORITY: ONBOARDING
Onboarding is make-or-break. It must be progressive, saved, private, reliable, and must feed downstream generation.

TASK
Audit the repo and identify major gaps between:
A) what is real/verified in code
B) what the product needs to be launchable

OUTPUT FORMAT (exact headings, in this order)

# HireWire Gap Audit

## Executive Summary
- 5 bullet max: what's real vs not real and the biggest launch risks

## What Is Real Today
- List only what is verifiably implemented. Each bullet MUST include file paths.

## What Is Not Real Yet
- List missing/fake/placeholder systems. Each bullet MUST include file paths or say "no code found".

## Onboarding Deep Audit
Start with a YES/NO answer to this question:
"Can the current onboarding reliably capture the essence of a user well enough to power excellent resume and cover letter generation?"
Then justify with evidence.

You MUST:
- identify the actual first-time user flow (routes + redirects)
- list exactly what profile fields are collected in UI and persisted
- identify whether onboarding is progressive vs giant form
- identify whether progress is saved and resumable
- identify whether uploads exist (resume upload, parsing, storage)
- identify LinkedIn/GitHub/website ingestion (real vs planned vs fake)
- identify whether profile is account-scoped and RLS-protected in practice (not just intent)

## Document Generation Readiness
Audit whether the system can generate strong tailored resumes + cover letters without generic filler.
Explicitly answer what prevents best-in-class output today.
Ground everything in files.

## Launch Blockers
- List only blockers (cannot responsibly launch without fixing)

## Gap Table
Create a table with columns:
Feature Area | Real Now | Partial Now | Missing Now | Launch Risk | Recommended Fix First
Use unambiguous language.

## File Level Findings
For each major gap, include:
- file path(s)
- what it currently does
- what the issue is
- what must change

## Priority Fix Order
Provide:
- Top 10 highest value fixes in exact order
- Why it matters
- What it unlocks
- Whether it is a launch blocker
Ground in file paths.

## Final Verdict
End with 5 blunt sections:
1) What HireWire already does well
2) What is giving a false sense of progress
3) What is most dangerous to launch without fixing
4) Whether onboarding is strong enough today
5) Whether the product is close to launch or structurally incomplete

MANDATORY: PLACEHOLDER SWEEP
Search for and enumerate every instance (file + snippet summary) of:
placeholder, mock, dummy, temp, fallback, lorem, fake, hardcoded demo values, invalid UI-rendered values.

No extra commentary outside the required sections.
```

---

## Prompt 2 (Codex-ready) — Execution Plan from Audit

```text
Now turn the gap audit into an execution plan.

Return ONLY:
1) The top 3 launch blockers
2) The top 3 onboarding fixes
3) The top 3 document quality fixes
4) The exact file-by-file implementation order (a numbered list)
5) The exact acceptance criteria for each fix (bullet list per fix)

Rules:
- No extra commentary.
- Each fix must reference specific files/routes/tables.
- Acceptance criteria must be testable and unambiguous.
```
