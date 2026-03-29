# 07. Data Model

## Known entities (from architecture + SQL scripts)
- `jobs`
- `user_profile`
- `processing_events`
- `generated_documents`
- `profile_snapshots`
- interview prep related tables
- evidence library related tables

## Relationship intent
- User owns profile and all downstream artifacts.
- Jobs link to generated docs, scoring status, and prep outputs.
- Events/logs provide operational traceability.

## Data integrity expectations
- Every user-visible artifact is user-scoped.
- Status transitions are auditable.
- Generated content should reference source evidence when possible.

## Missing / to formalize
- ERD with keys, constraints, cascade behavior.
- Data retention windows per table.
- Backup/restore runbook and RPO/RTO targets.
- PII classification map.
