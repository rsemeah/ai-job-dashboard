# 08. API & Integration Map

## Internal API routes
- Profile: `/api/profile`
- Analysis: `/api/analyze`
- Document generation: `/api/generate-documents`
- Interview prep: `/api/generate-interview-prep`, `/api/interview-prep/[jobId]`
- Export: `/api/export/resume`, `/api/export/cover-letter`

## External integrations (current architecture)
- Supabase (auth + DB + storage)
- n8n webhook orchestration (test + production endpoints documented)
- AI provider(s) via server routes/lib (implementation-specific)

## Integration quality bars
- Idempotent intake handling
- Timeout/retry strategy
- Structured error propagation to UI
- Event logging with correlation/request IDs

## Missing
- Central API contract docs with request/response examples per route.
- Integration failure matrix (what fails, what user sees, what retries).
- Versioning strategy for API payloads.
