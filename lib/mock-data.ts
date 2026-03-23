/**
 * Mock data — AI PM / TPM persona (Rory Semeah)
 * Target: remote-first, $140k–$165k, AI / LLM / API product roles
 * All data is schema-aligned to lib/types.ts
 */
import type {
  Job,
  GeneratedDocument,
  Application,
  WorkflowLog,
  ReadyQueueItem,
  JobDetail,
  BaseResume,
  Settings,
} from "@/lib/types"
import { enrichJob } from "@/lib/utils"

// ── Time helpers ──────────────────────────────────────────────────────────────
const now = Date.now()
const h = (n: number) => new Date(now - n * 3_600_000).toISOString()
const d = (n: number) => new Date(now - n * 86_400_000).toISOString()
const f = (n: number) => new Date(now + n * 86_400_000).toISOString()

// ── Base resume ───────────────────────────────────────────────────────────────
export const MOCK_BASE_RESUME: BaseResume = {
  id: "br-001",
  version: 1,
  is_active: true,
  raw_text: `RORY SEMEAH
AI Product Manager | Technical PM
San Diego, CA  ·  rory@example.com

SUMMARY
Product leader with 6+ years shipping AI-powered platforms and API-first products at enterprise scale. Deep technical fluency with LLM orchestration, REST APIs, and data pipelines. Proven ability to align cross-functional teams and translate ambiguous ML problems into shipped product.

EXPERIENCE

Sr. Product Manager · Ingram Micro · 2021–2024
- Led AI forecasting platform for 2,000+ channel resellers; drove 40% increase in partner API adoption
- Defined partner API strategy and roadmap; collaborated with 8 engineering teams across 3 time zones
- Shipped GPT-4 content generation feature cutting manual content ops by 60%; 200k+ monthly outputs
- Managed $2.4M product budget; delivered on time across 4 consecutive quarters

Product Manager · TechStartup · 2019–2021
- Built 0→1 LLM text classification platform; grew from internal tool to 12 enterprise customers
- Wrote PRDs, led user research, owned backlog from discovery through launch

SKILLS
LLM orchestration, OpenAI API, Anthropic API, Next.js, Supabase, Node.js, Python, SQL, REST API design, Jira, Figma

EDUCATION
B.S. Computer Science · UC San Diego · 2019`,
  created_at: d(14),
  updated_at: d(3),
}

// ── Jobs ──────────────────────────────────────────────────────────────────────
export const mockJobs: Job[] = [
  {
    id: "1",
    title: "AI Product Manager",
    company: "Scale AI",
    source: "GREENHOUSE",
    source_url: "https://boards.greenhouse.io/scaleai/jobs/4982341",
    source_job_id: "scaleai-4982341",
    raw_description: `Scale AI is looking for an AI Product Manager to own our data labeling platform roadmap.

You will work directly with ML engineers to translate data quality requirements into product features, define API contracts for our labeling workforce tools, and drive adoption across enterprise customers.

Requirements:
- 5+ years product management experience
- Deep familiarity with LLMs, embeddings, or ML data pipelines
- Strong API and systems thinking
- Excellent written and verbal communication
- Experience shipping B2B SaaS products

Nice to have:
- Prior experience with data labeling or RLHF workflows
- Familiarity with workforce management tools

Compensation: $150,000 – $175,000 + equity
Location: Remote (US)`,
    location: "Remote",
    salary_range: "$150,000 – $175,000",
    is_remote: true,
    status: "READY_TO_APPLY",
    fit: "HIGH",
    score: 91,
    score_reasoning: [
      "Direct AI PM role with LLM platform focus matches core background",
      "API-first product experience aligns with labeling platform context",
      "Remote with salary 8% above target range",
    ],
    score_strengths: [
      "LLM orchestration and OpenAI API experience directly applicable",
      "API product ownership at scale (2,000+ resellers)",
      "B2B SaaS shipping track record",
    ],
    score_gaps: [
      "Data labeling / RLHF domain is new — fast ramp required",
    ],
    keywords_extracted: {
      skills: ["LLM", "API design", "B2B SaaS", "data quality"],
      tools: ["Python", "SQL", "REST APIs"],
      responsibilities: ["roadmapping", "ML collaboration", "enterprise adoption"],
    },
    dedup_hash: "hash_scaleai_aipm_4982341",
    posted_at: h(18),
    scored_at: h(12),
    applied_at: null,
    created_at: h(20),
    updated_at: h(10),
  },
  {
    id: "2",
    title: "Technical PM – Platform",
    company: "Rippling",
    source: "ZIPRECRUITER",
    source_url: "https://www.ziprecruiter.com/jobs/rippling-457329",
    source_job_id: "zr-457329",
    raw_description: `Rippling is hiring a Technical Product Manager to own our workflow automation platform.

You'll define the roadmap for our no-code workflow builder, work with backend engineers on API design, write detailed technical specs, and partner with enterprise customers to understand integration needs.

Requirements:
- 4–8 years PM experience, ideally with workflow or integration products
- Strong API and systems thinking
- Comfort reading code and writing technical specs
- Experience with enterprise sales cycles

Compensation: $140,000 – $165,000
Location: San Francisco, CA (Remote-first team)`,
    location: "SF, CA (Remote-first)",
    salary_range: "$140,000 – $165,000",
    is_remote: true,
    status: "READY_TO_APPLY",
    fit: "HIGH",
    score: 84,
    score_reasoning: [
      "TPM workflow automation role aligns with partner integration background",
      "API and systems thinking explicitly valued — strong match",
      "Salary fits target range exactly ($140k–$165k)",
    ],
    score_strengths: [
      "Workflow automation experience at Ingram Micro directly applicable",
      "API roadmap ownership matches TPM spec-writing requirement",
    ],
    score_gaps: [
      "HR/payroll domain (Rippling's core) is unfamiliar",
    ],
    keywords_extracted: {
      skills: ["workflow automation", "API design", "technical specs"],
      tools: ["REST APIs", "SQL", "Jira"],
      responsibilities: ["roadmapping", "spec writing", "enterprise partnerships"],
    },
    dedup_hash: "hash_rippling_tpm_457329",
    posted_at: d(2),
    scored_at: d(2),
    applied_at: null,
    created_at: d(2),
    updated_at: d(1),
  },
  {
    id: "3",
    title: "PM, AI Features",
    company: "Notion",
    source: "GREENHOUSE",
    source_url: "https://boards.greenhouse.io/notion/jobs/5014782",
    source_job_id: "notion-5014782",
    raw_description: `Notion is looking for a PM to lead our AI feature development.

You will own the roadmap for Notion AI — LLM-powered writing, summarization, and workflow features. You'll work closely with ML engineers, design, and GTM to ship AI features used by millions of users.

Requirements:
- 3+ years PM experience at a SaaS company
- Strong intuition for consumer and B2B product experiences
- Excitement about AI and LLMs
- Excellent communication and cross-functional skills

Compensation: $145,000 – $170,000
Location: Remote`,
    location: "Remote",
    salary_range: "$145,000 – $170,000",
    is_remote: true,
    status: "SCORED",
    fit: "HIGH",
    score: 78,
    score_reasoning: [
      "AI feature ownership matches LLM product background",
      "B2B SaaS experience relevant though consumer-facing aspect is new",
      "Salary at top of target range",
    ],
    score_strengths: [
      "LLM product experience (GPT-4 feature at Ingram) directly applicable",
      "B2B SaaS background relevant",
    ],
    score_gaps: [
      "Consumer-facing product at massive scale (millions of users) is new territory",
      "Score just below APPLY threshold (80) — strong REVIEW",
    ],
    keywords_extracted: {
      skills: ["LLM features", "AI writing", "B2B + consumer SaaS"],
      tools: ["Figma", "Amplitude"],
      responsibilities: ["feature discovery", "user research", "GTM partnership"],
    },
    dedup_hash: "hash_notion_pm_ai_5014782",
    posted_at: h(5),
    scored_at: h(2),
    applied_at: null,
    created_at: h(6),
    updated_at: h(2),
  },
  {
    id: "4",
    title: "PM – Enterprise Integrations",
    company: "HubSpot",
    source: "JOBOT",
    source_url: "https://www.jobot.com/jobs/hubspot-101",
    source_job_id: "jobot-101",
    raw_description: `HubSpot is seeking a PM for our Enterprise Integrations team.

You'll own the partner ecosystem roadmap, define integration standards for our App Marketplace, and work with enterprise sales teams to deliver the integrations that close deals.

Requirements:
- PM experience with API/integration products
- Familiarity with CRM or marketing technology
- Strong stakeholder management skills

Compensation: $130,000 – $155,000
Location: Cambridge, MA (Hybrid — 3 days/week)`,
    location: "Cambridge, MA (Hybrid)",
    salary_range: "$130,000 – $155,000",
    is_remote: false,
    status: "APPLIED",
    fit: "MEDIUM",
    score: 72,
    score_reasoning: [
      "Enterprise API integration experience is a match",
      "Hybrid location requirement is a constraint for remote-first search",
      "Below salary target by $10k–$15k",
    ],
    score_strengths: ["Enterprise API integration background"],
    score_gaps: [
      "Hybrid mandate conflicts with remote-first preference",
      "CRM / marketing domain unfamiliar",
      "Salary $10k–$15k below target",
    ],
    keywords_extracted: {
      skills: ["enterprise integrations", "partner ecosystem"],
      tools: ["HubSpot CRM", "REST APIs"],
      responsibilities: ["partner roadmap", "App Marketplace", "enterprise sales"],
    },
    dedup_hash: "hash_hubspot_pm_integrations_101",
    posted_at: d(4),
    scored_at: d(3),
    applied_at: d(2),
    created_at: d(4),
    updated_at: d(2),
  },
  {
    id: "5",
    title: "Senior AI PM",
    company: "Anthropic",
    source: "GREENHOUSE",
    source_url: "https://boards.greenhouse.io/anthropic/jobs/4856123",
    source_job_id: "anthropic-4856123",
    raw_description: `Anthropic is hiring a Senior AI PM to shape the product strategy for Claude.

You will own the roadmap for Claude's API and developer experience, define how enterprise customers deploy Claude in their products, and work with research teams to translate model capabilities into product features.

Requirements:
- 7+ years product management experience
- Deep understanding of LLMs and AI safety principles
- Experience shipping API products for developers
- Excellent judgment in ambiguous, fast-moving environments

Compensation: $175,000 – $220,000
Location: San Francisco (Remote-friendly)`,
    location: "San Francisco (Remote-friendly)",
    salary_range: "$175,000 – $220,000",
    is_remote: true,
    status: "INTERVIEW",
    fit: "HIGH",
    score: 95,
    score_reasoning: [
      "Near-perfect alignment: AI/LLM/API and enterprise deployment all match core background",
      "API developer experience ownership directly applicable",
      "Salary 31% above target — significantly above range",
    ],
    score_strengths: [
      "LLM orchestration and Anthropic/OpenAI API experience directly applicable",
      "API product ownership at enterprise scale matches exactly",
      "Technical depth in AI safety context is learnable given ML PM background",
    ],
    score_gaps: [
      "AI safety as a discipline is specialized — ramp time expected",
    ],
    keywords_extracted: {
      skills: ["LLM products", "AI safety", "API developer experience"],
      tools: ["Python", "SQL"],
      responsibilities: ["product strategy", "developer experience", "enterprise deployments"],
    },
    dedup_hash: "hash_anthropic_senior_ai_pm_4856123",
    posted_at: d(11),
    scored_at: d(10),
    applied_at: d(10),
    created_at: d(11),
    updated_at: d(1),
  },
  {
    id: "6",
    title: "PM, Developer Platform",
    company: "Stripe",
    source: "GREENHOUSE",
    source_url: "https://boards.greenhouse.io/stripe/jobs/5109877",
    source_job_id: "stripe-5109877",
    raw_description: `Stripe is looking for a PM to own our developer platform experience.

You will define the roadmap for how developers discover, adopt, and integrate Stripe APIs. You'll improve our documentation, SDKs, and sandbox tooling, and work with enterprise customers to reduce time-to-first-transaction.

Requirements:
- 4+ years PM experience with developer tools or API products
- Strong technical empathy — you understand what great DX feels like
- Experience with enterprise software sales and onboarding
- Analytical — comfortable with funnel metrics and cohort analysis

Compensation: $160,000 – $190,000
Location: Remote (US)`,
    location: "Remote (US)",
    salary_range: "$160,000 – $190,000",
    is_remote: true,
    status: "NEW",
    fit: "UNSCORED",
    score: null,
    score_reasoning: null,
    score_strengths: null,
    score_gaps: null,
    keywords_extracted: null,
    dedup_hash: "hash_stripe_pm_devplatform_5109877",
    posted_at: h(1),
    scored_at: null,
    applied_at: null,
    created_at: h(2),
    updated_at: h(1),
  },
]

// ── Generated documents ───────────────────────────────────────────────────────
export const mockGeneratedDocuments: GeneratedDocument[] = [
  {
    id: "doc-1",
    job_id: "1",
    base_resume_id: "br-001",
    doc_type: "RESUME",
    model_used: "gpt-4o",
    prompt_version: "resume-v1.0",
    content: `RORY SEMEAH
AI Product Manager
San Diego, CA  ·  rory@example.com

SUMMARY
AI product leader with 6+ years building LLM-powered platforms and API-first products at enterprise scale. Shipped GPT-4 features reducing manual ops by 60% at Ingram Micro; drove 40% increase in partner API adoption across 2,000+ resellers.

EXPERIENCE

Sr. Product Manager · Ingram Micro · 2021–2024
- Led AI forecasting platform for 2,000+ channel resellers; +40% partner API adoption
- Shipped GPT-4 content generation cutting manual content ops by 60%; 200k+ monthly outputs
- Defined partner API strategy; collaborated with 8 engineering teams across 3 time zones
- Managed $2.4M product budget; delivered on time across 4 consecutive quarters

Product Manager · TechStartup · 2019–2021
- Built 0→1 LLM text classification platform; grew to 12 enterprise customers

SKILLS
LLM orchestration, OpenAI API, API product design, B2B SaaS, Next.js, Supabase, Python, SQL

EDUCATION
B.S. Computer Science · UC San Diego · 2019`,
    created_at: h(10),
    updated_at: h(10),
  },
  {
    id: "doc-2",
    job_id: "1",
    base_resume_id: "br-001",
    doc_type: "COVER_LETTER",
    model_used: "gpt-4o",
    prompt_version: "cover-letter-v1.0",
    content: `Dear Hiring Manager,

I'm applying for the AI Product Manager role at Scale AI because building reliable data infrastructure for ML systems is the product problem I've spent years working toward — and this role sits at the exact intersection of LLMs, API design, and enterprise product that defines my background.

At Ingram Micro, I led an AI-powered forecasting platform serving 2,000+ enterprise partners and shipped a GPT-4 content generation tool that cut manual operations by 60% across 200k+ monthly outputs. What I learned: AI features fail at the integration layer, not the model layer. Getting API contracts right — and getting adoption — is the hard part.

At Scale, I'd bring technical depth to collaborate with ML engineers on data quality requirements and product instincts to translate labeling workflow problems into a roadmap enterprise customers actually need. I'm ready to own this from day one.

Rory Semeah`,
    created_at: h(10),
    updated_at: h(10),
  },
  {
    id: "doc-3",
    job_id: "2",
    base_resume_id: "br-001",
    doc_type: "RESUME",
    model_used: "gpt-4o",
    prompt_version: "resume-v1.0",
    content: `RORY SEMEAH
Technical Product Manager
San Diego, CA (Remote)  ·  rory@example.com

SUMMARY
TPM with 6+ years building workflow automation and API-first products at enterprise scale. Owned partner integration roadmap at Ingram Micro — +40% API adoption, -3 weeks partner onboarding.

EXPERIENCE

Sr. Product Manager · Ingram Micro · 2021–2024
- Owned partner API roadmap; drove 40% adoption increase across 2,000+ enterprise resellers
- Led workflow automation reducing partner onboarding from 5 weeks to 2 weeks
- Wrote detailed technical specs collaborating with 8 engineering teams
- Shipped GPT-4 content automation; -60% manual content ops

Product Manager · TechStartup · 2019–2021
- Built 0→1 LLM classification platform; 12 enterprise customers

SKILLS
Workflow automation, API design, technical specs, REST APIs, SQL, Python, Jira, Figma

EDUCATION
B.S. Computer Science · UC San Diego · 2019`,
    created_at: d(1),
    updated_at: d(1),
  },
  {
    id: "doc-4",
    job_id: "2",
    base_resume_id: "br-001",
    doc_type: "COVER_LETTER",
    model_used: "gpt-4o",
    prompt_version: "cover-letter-v1.0",
    content: `Dear Rippling Team,

Rippling's workflow automation platform is one of the most technically interesting PM challenges in HR tech — and it sits squarely in my core competency.

At Ingram Micro I owned the partner integration roadmap and shipped workflow automation that cut onboarding from five weeks to two weeks across thousands of enterprise customers. The product challenge was identical to what Rippling faces: customers need flexible no-code automation that still respects complex business rules and integrates cleanly with upstream APIs.

At Rippling I'd bring strong API systems thinking, a track record of shipping integrations enterprise teams actually adopt, and the technical comfort to write specs that backend engineers can execute directly.

Rory Semeah`,
    created_at: d(1),
    updated_at: d(1),
  },
]

// ── Applications ──────────────────────────────────────────────────────────────
export const mockApplications: Application[] = [
  {
    id: "app-1",
    job_id: "4",
    submitted_at: d(2),
    submission_method: "MANUAL",
    portal_url: "https://www.hubspot.com/careers/jobs/101/apply",
    confirmation_code: "HS-APP-2025-0847",
    response_received: false,
    response_date: null,
    response_notes: null,
    interview_date: null,
    interview_type: null,
    interview_notes: null,
    created_at: d(2),
    updated_at: d(2),
  },
  {
    id: "app-2",
    job_id: "5",
    submitted_at: d(10),
    submission_method: "MANUAL",
    portal_url: "https://boards.greenhouse.io/anthropic/jobs/4856123/apply",
    confirmation_code: null,
    response_received: true,
    response_date: d(5),
    response_notes:
      "Recruiter reached out via email. Phone screen scheduled. Prep: Claude API, AI safety product thinking, enterprise deployment models.",
    interview_date: f(2),
    interview_type: "PHONE",
    interview_notes:
      "Prep topics: Claude API product strategy, AI safety as product constraint, how to balance safety vs. capability in roadmap decisions.",
    created_at: d(10),
    updated_at: d(5),
  },
]

// ── Workflow logs ─────────────────────────────────────────────────────────────
export const mockWorkflowLogs: WorkflowLog[] = [
  {
    id: "lg-1",
    job_id: "6",
    workflow_name: "JOB_INTAKE",
    step_name: "job_inserted",
    status: "SUCCESS",
    input_snapshot: null,
    output_snapshot: { title: "PM, Developer Platform", company: "Stripe" },
    error_message: null,
    duration_ms: 234,
    created_at: h(2),
  },
  {
    id: "lg-2",
    job_id: "1",
    workflow_name: "JOB_SCORING",
    step_name: "scored",
    status: "SUCCESS",
    input_snapshot: null,
    output_snapshot: { score: 91, fit: "HIGH" },
    error_message: null,
    duration_ms: 1840,
    created_at: h(12),
  },
  {
    id: "lg-3",
    job_id: "1",
    workflow_name: "DOCUMENT_GENERATION",
    step_name: "docs_generated",
    status: "SUCCESS",
    input_snapshot: null,
    output_snapshot: { docs: ["RESUME", "COVER_LETTER"], model: "gpt-4o" },
    error_message: null,
    duration_ms: 6200,
    created_at: h(10),
  },
  {
    id: "lg-4",
    job_id: null,
    workflow_name: "JOB_INTAKE",
    step_name: "dedup_skip",
    status: "SKIPPED",
    input_snapshot: null,
    output_snapshot: { reason: "duplicate hash already in dedup_registry" },
    error_message: null,
    duration_ms: 45,
    created_at: h(6),
  },
  {
    id: "lg-5",
    job_id: null,
    workflow_name: "JOB_INTAKE",
    step_name: "fetch_jobot",
    status: "ERROR",
    input_snapshot: null,
    output_snapshot: null,
    error_message:
      "HTTP 429: Rate limited. Retry-After: 3600s. Note: Jobot has no official API — this connector is fragile and may break without notice.",
    duration_ms: 5001,
    created_at: h(3),
  },
  {
    id: "lg-6",
    job_id: "4",
    workflow_name: "APPLICATION_TRACKING",
    step_name: "application_submitted",
    status: "SUCCESS",
    input_snapshot: null,
    output_snapshot: { method: "MANUAL", job_id: "4" },
    error_message: null,
    duration_ms: 180,
    created_at: d(2),
  },
  {
    id: "lg-7",
    job_id: "5",
    workflow_name: "APPLICATION_TRACKING",
    step_name: "status_updated",
    status: "SUCCESS",
    input_snapshot: null,
    output_snapshot: { new_status: "INTERVIEW", interview_type: "PHONE" },
    error_message: null,
    duration_ms: 145,
    created_at: d(5),
  },
  {
    id: "lg-8",
    job_id: null,
    workflow_name: "JOB_SCORING",
    step_name: "parse_error",
    status: "ERROR",
    input_snapshot: null,
    output_snapshot: null,
    error_message:
      "JSON.parse failed: model returned markdown-wrapped block instead of raw JSON. Retried once — still failed. Job left as UNSCORED.",
    duration_ms: 2100,
    created_at: d(1),
  },
  {
    id: "lg-9",
    job_id: "2",
    workflow_name: "JOB_SCORING",
    step_name: "scored",
    status: "SUCCESS",
    input_snapshot: null,
    output_snapshot: { score: 84, fit: "HIGH" },
    error_message: null,
    duration_ms: 1640,
    created_at: d(2),
  },
  {
    id: "lg-10",
    job_id: "3",
    workflow_name: "JOB_SCORING",
    step_name: "scored",
    status: "SUCCESS",
    input_snapshot: null,
    output_snapshot: { score: 78, fit: "HIGH" },
    error_message: null,
    duration_ms: 1920,
    created_at: h(2),
  },
]

// ── Ready queue (computed from jobs) ─────────────────────────────────────────
export const mockReadyQueue: ReadyQueueItem[] = mockJobs
  .filter((job) => job.status === "READY_TO_APPLY")
  .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
  .map((job) => ({
    id: job.id,
    title: job.title,
    company: job.company,
    source: job.source,
    source_url: job.source_url,
    score: job.score,
    fit: job.fit,
    salary_range: job.salary_range,
    is_remote: job.is_remote,
    status: job.status,
    created_at: job.created_at,
    docs_generated_count: mockGeneratedDocuments.filter(
      (doc) => doc.job_id === job.id,
    ).length,
  }))

// ── Settings ──────────────────────────────────────────────────────────────────
export const mockSettings: Settings = {
  active_resume: "base_resume_v1",
  score_threshold: 80,
  source_toggles: {
    GREENHOUSE: true,
    ZIPRECRUITER: true,
    JOBOT: false, // disabled — no official API, fragile
    MANUAL: true,
  },
}

// ── Helper functions ──────────────────────────────────────────────────────────

export function getJobById(id: string): Job | undefined {
  return mockJobs.find((job) => job.id === id)
}

export function getDocumentsForJob(jobId: string): GeneratedDocument[] {
  return mockGeneratedDocuments.filter((doc) => doc.job_id === jobId)
}

export function getApplicationForJob(jobId: string): Application | undefined {
  return mockApplications.find((app) => app.job_id === jobId)
}

export function getLogsForJob(jobId: string): WorkflowLog[] {
  return mockWorkflowLogs.filter((log) => log.job_id === jobId)
}

export function getJobWithRelations(id: string): JobDetail | null {
  const job = getJobById(id)
  if (!job) return null
  return {
    ...enrichJob(job),
    documents: getDocumentsForJob(id),
    application: getApplicationForJob(id) ?? null,
    logs: getLogsForJob(id),
  }
}
