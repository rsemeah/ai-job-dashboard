# 01. Product Brief

## Product
- **Name:** HireWire
- **Category:** AI-assisted job search workflow tool
- **Primary promise:** Turn one real job link into a trustworthy, tailored application packet without rewriting your story from scratch every time.

## The User Problem (Plain Language)
Most job seekers are not missing ambition. They are missing a reliable system.

Today they juggle:
- scattered resume versions
- generic AI drafts that sound fake
- unclear fit signals
- panic before interviews

The result is low-confidence applications, inconsistent quality, and burnout.

## Who v1 is for (Ideal User Story)
**Primary v1 user:** Mid-career operator/PM/TPM applying to multiple roles weekly.

Example:
- 8+ years of solid experience
- good outcomes, weak resume storytelling
- tired of re-tailoring from scratch
- skeptical of AI hallucination risk
- wants speed, but only with truth and control

## 10-Second Value Proposition
"Paste a job. Get a tailored packet grounded in your real evidence, with full control before export."

## What the user does first (Speed to First Win)
1. Create account
2. Add resume (or start from profile fields)
3. Confirm extracted basics (name, role history, skills)
4. Add a few wins/projects (even rough notes)
5. Paste one target job URL

**Time to first meaningful output:** one session.

## What HireWire does automatically
- extracts job requirements from the posting
- scores fit and explains why
- maps your experience to role needs
- drafts tailored resume + cover letter
- prepares interview talking points/STAR material

## What control the user keeps
- approve edits before they become profile truth
- edit generated bullets and cover letter text
- reject weak suggestions
- keep multiple versions
- see where each claim came from (evidence/provenance)
- lock profile sections they do not want rewritten

## Why this is different from "ChatGPT + template"
1. **Persistent memory:** does not restart from zero for each application
2. **Evidence grounding:** uses your wins/projects, not keyword stuffing alone
3. **Fit clarity:** tells you when a role may be low-leverage and why
4. **Workflow continuity:** resume -> cover letter -> interview prep in one flow
5. **Trust guardrails:** no silent invention of accomplishments

## Evidence Library (User Translation)
In HireWire, "evidence" means:
- wins you delivered
- projects you owned
- problems you solved
- impact metrics (if available)
- story fragments when numbers are unavailable
- proof of soft skills through concrete moments

Users can start imperfectly. Strong wording can be improved later; real substance is what matters first.

## Emotional Safeguard in Scoring
If fit is weak, HireWire should never behave like a gatekeeper.

It should:
- explain why fit is weak in plain language
- show what is still transferable
- let users proceed anyway
- suggest how to reposition for this role
- suggest what to strengthen for future roles

## Output Trust Signals (Receipts)
To earn trust, output quality must be visible, not promised.

v1 trust signals:
- before/after rewrite examples
- editable drafts prior to export
- side-by-side version comparison
- visible claim provenance (where each line came from)
- banned generic phrasing checks

## End-to-End User Journey (What happens after upload)
1. Upload resume or enter profile basics
2. HireWire extracts skills/experience
3. User confirms/corrects extraction
4. User adds key wins (quick evidence capture)
5. User pastes job URL
6. HireWire analyzes fit and explains reasoning
7. HireWire drafts tailored resume + cover letter
8. User reviews, edits, and approves
9. User exports documents
10. HireWire generates interview prep for that role

## Before vs After (Visible Transformation)
**Before HireWire**
- scattered resume files
- inconsistent tailoring
- no reusable proof system
- interview anxiety
- unclear role fit

**After HireWire**
- one trusted profile
- reusable evidence bank
- targeted applications
- cleaner, grounded outputs
- interview readiness
- stronger momentum

## Desired User Outcome
- **First-session win:** one real job analyzed with editable, tailored materials generated
- **Weekly win:** faster high-quality applications with lower cognitive load
- **Confidence win:** users trust that outputs sound like them and stay tied to real experience

## Captured now
- Auth, onboarding route, intake UI, dashboard surfaces, documents pages, and interview-prep routes are present.
- Evidence-oriented generation and quality checks are implemented in current architecture.
- Launch/readiness docs now explicitly center trust, control, and speed-to-value.

## Open Questions / Missing
- Define exact onboarding input options at first screen (resume upload, pasted profile, guided form).
- Add explicit UI affordances for "lock this section" and "show provenance" in all editing surfaces.
- Publish concrete before/after examples in-product to prove quality claims.
- Lock one north-star metric and launch threshold tied to first-session value.
