# 09. Analytics Event Map

## Product funnel events
1. `signup_started`
2. `signup_completed`
3. `onboarding_started`
4. `onboarding_completed`
5. `job_intake_submitted`
6. `job_analyzed`
7. `resume_generated`
8. `cover_letter_generated`
9. `export_completed`
10. `return_session`

## Monetization events (future-ready)
- `upgrade_viewed`
- `upgrade_started`
- `upgrade_completed`
- `payment_failed`
- `subscription_canceled`

## Operational events
- `api_error`
- `job_parse_failed`
- `generation_failed`
- `export_failed`
- latency metrics by endpoint

## Dashboard metrics to own weekly
- Activation rate
- Time to first value
- 7-day retention
- Generation success rate
- Export success rate

## Missing
- Event owner per event
- Event schema/props contract
- Tooling destination mapping (e.g., PostHog/Amplitude/Supabase)
