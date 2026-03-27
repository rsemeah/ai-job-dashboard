-- TruthSerum Test Data Seed
-- Creates sample evidence with different confidence levels and usage rules
-- Creates sample jobs with different fit levels (strong, adjacent, weak)

-- First, clear existing data (optional - comment out if you want to keep existing data)
-- DELETE FROM evidence_library;
-- DELETE FROM jobs;

-- Insert evidence with different confidence levels and restrictions
INSERT INTO evidence_library (
  id,
  source_type,
  source_title,
  project_name,
  role_name,
  company_name,
  date_range,
  industries,
  role_family_tags,
  responsibilities,
  tools_used,
  outcomes,
  approved_keywords,
  approved_achievement_bullets,
  confidence_level,
  evidence_weight,
  is_user_approved,
  visibility_status,
  is_active,
  priority_rank,
  what_not_to_overstate,
  user_problem,
  business_goal,
  what_shipped
) VALUES

-- High confidence, fully usable evidence
(
  'a0000001-0000-0000-0000-000000000001',
  'work_experience',
  'AI Forecasting Platform Lead',
  'Partner Demand Forecasting Platform',
  'Senior Product Manager',
  'Ingram Micro',
  '2021-2024',
  ARRAY['Enterprise Software', 'B2B', 'AI/ML'],
  ARRAY['Technical Product Manager', 'AI Product Manager'],
  ARRAY['Led end-to-end product development for AI-powered forecasting platform', 'Managed cross-functional team of 12 engineers across 3 time zones', 'Defined API strategy for partner integrations'],
  ARRAY['Python', 'SQL', 'AWS', 'OpenAI API', 'REST APIs', 'Jira', 'Figma'],
  ARRAY['Increased partner API adoption by 40%', 'Served 2,000+ channel resellers', 'Reduced manual forecasting time by 60%'],
  ARRAY['AI forecasting', 'API product', 'partner platform', 'B2B SaaS', 'enterprise scale'],
  ARRAY['Led AI forecasting platform for 2,000+ channel resellers; drove 40% increase in partner API adoption', 'Managed $2.4M product budget; delivered on time across 4 consecutive quarters'],
  'high',
  'highest',
  true,
  'active',
  true,
  1,
  NULL,
  'Partners needed accurate demand forecasting to optimize inventory',
  'Increase partner retention and platform stickiness through AI-powered insights',
  'ML-powered forecasting dashboard with API integrations'
),

-- High confidence, LLM specific
(
  'a0000001-0000-0000-0000-000000000002',
  'shipped_product',
  'GPT-4 Content Generation Feature',
  'Automated Content Generation',
  'Senior Product Manager',
  'Ingram Micro',
  '2023',
  ARRAY['AI/ML', 'Content', 'Enterprise'],
  ARRAY['AI Product Manager'],
  ARRAY['Defined product requirements for GPT-4 integration', 'Led user research with content operations team', 'Shipped iteratively with A/B testing'],
  ARRAY['GPT-4', 'OpenAI API', 'Python', 'React', 'Next.js'],
  ARRAY['Cut manual content operations by 60%', 'Generated 200k+ monthly content outputs', 'Reduced content creation time from 2 hours to 10 minutes'],
  ARRAY['LLM integration', 'GPT-4', 'content automation', 'AI features', 'generative AI'],
  ARRAY['Shipped GPT-4 content generation feature cutting manual content ops by 60%; 200k+ monthly outputs'],
  'high',
  'highest',
  true,
  'active',
  true,
  2,
  'Do not claim I built the ML model - I was the PM',
  'Content team spent hours on repetitive product descriptions',
  'Automate 80% of routine content creation',
  'GPT-4 powered content generator with human review workflow'
),

-- Medium confidence, good but less verifiable
(
  'a0000001-0000-0000-0000-000000000003',
  'work_experience',
  'LLM Text Classification Platform',
  '0-1 Classification Product',
  'Product Manager',
  'TechStartup',
  '2019-2021',
  ARRAY['AI/ML', 'SaaS', 'Startup'],
  ARRAY['Product Manager', 'AI Product Manager'],
  ARRAY['Built 0-1 LLM text classification platform', 'Led user research and discovery', 'Owned product backlog through launch'],
  ARRAY['Python', 'TensorFlow', 'AWS', 'PostgreSQL'],
  ARRAY['Grew from internal tool to 12 enterprise customers', 'Achieved 95% classification accuracy'],
  ARRAY['LLM', 'text classification', 'NLP', '0-1 product', 'enterprise customers'],
  ARRAY['Built 0→1 LLM text classification platform; grew from internal tool to 12 enterprise customers'],
  'medium',
  'high',
  true,
  'active',
  true,
  3,
  'Startup metrics may not be independently verifiable',
  'Manual document classification was slow and error-prone',
  'Automate document processing for legal teams',
  'Text classification API with custom model training'
),

-- Interview only evidence
(
  'a0000001-0000-0000-0000-000000000004',
  'achievement',
  'Enterprise Deal Strategy',
  'Enterprise Sales Support',
  'Senior Product Manager',
  'Ingram Micro',
  '2022-2023',
  ARRAY['Enterprise', 'Sales'],
  ARRAY['Product Manager'],
  ARRAY['Supported enterprise sales team in closing $5M+ deals', 'Created custom demos and ROI calculators'],
  ARRAY['Salesforce', 'PowerPoint', 'Excel'],
  ARRAY['Contributed to closing 3 enterprise deals worth $15M combined'],
  ARRAY['enterprise sales', 'deal support', 'ROI analysis'],
  ARRAY['Supported closure of 3 enterprise deals totaling $15M'],
  'high',
  'medium',
  true,
  'active',
  true,
  5,
  'INTERVIEW ONLY - Cannot put specific deal amounts on resume without approval',
  NULL,
  NULL,
  NULL
),

-- Blocked evidence (should never appear in generated content)
(
  'a0000001-0000-0000-0000-000000000005',
  'work_experience',
  'Confidential Project Alpha',
  'Project Alpha',
  'Product Manager',
  'Previous Company',
  '2018-2019',
  ARRAY['Stealth', 'AI'],
  ARRAY['Product Manager'],
  ARRAY['Led development of confidential AI product'],
  ARRAY['Classified'],
  ARRAY['Cannot disclose'],
  ARRAY['confidential', 'stealth'],
  ARRAY[]::text[],
  'low',
  'low',
  false,
  'archived',
  false,
  99,
  'BLOCKED - Under NDA, cannot use any details from this project',
  NULL,
  NULL,
  NULL
),

-- Low confidence evidence that needs verification
(
  'a0000001-0000-0000-0000-000000000006',
  'portfolio_entry',
  'Open Source Contribution',
  'AI SDK Plugin',
  'Contributor',
  'Open Source',
  '2023',
  ARRAY['Developer Tools', 'Open Source'],
  ARRAY['Technical Product Manager'],
  ARRAY['Created plugin for popular AI SDK'],
  ARRAY['TypeScript', 'AI SDK', 'npm'],
  ARRAY['50+ GitHub stars', 'Used by 100+ developers'],
  ARRAY['open source', 'AI SDK', 'developer tools'],
  ARRAY['Created AI SDK plugin with 50+ GitHub stars'],
  'low',
  'low',
  false,
  'active',
  true,
  8,
  'Metrics not independently verified - do not overstate impact',
  NULL,
  NULL,
  NULL
),

-- Cover letter only evidence
(
  'a0000001-0000-0000-0000-000000000007',
  'achievement',
  'Industry Recognition',
  'Product Management Award',
  'Senior Product Manager',
  'Ingram Micro',
  '2023',
  ARRAY['Enterprise'],
  ARRAY['Product Manager'],
  ARRAY['Received internal recognition for product leadership'],
  ARRAY[]::text[],
  ARRAY['Named Product Leader of the Quarter'],
  ARRAY['recognition', 'leadership', 'product excellence'],
  ARRAY[]::text[],
  'medium',
  'medium',
  true,
  'active',
  true,
  7,
  'COVER LETTER ONLY - Internal award, not suitable for resume bullets but good for narrative'
)

ON CONFLICT (id) DO UPDATE SET
  source_title = EXCLUDED.source_title,
  project_name = EXCLUDED.project_name,
  responsibilities = EXCLUDED.responsibilities,
  tools_used = EXCLUDED.tools_used,
  outcomes = EXCLUDED.outcomes,
  approved_keywords = EXCLUDED.approved_keywords,
  confidence_level = EXCLUDED.confidence_level,
  what_not_to_overstate = EXCLUDED.what_not_to_overstate;

-- Insert test jobs with different fit levels

-- Strong fit job (should use direct_match strategy)
INSERT INTO jobs (
  id,
  title,
  company,
  source,
  source_url,
  status,
  fit,
  score,
  role_family,
  industry_guess,
  seniority_level,
  location,
  salary_range,
  responsibilities,
  qualifications_required,
  qualifications_preferred,
  ats_keywords
) VALUES (
  'b0000001-0000-0000-0000-000000000001',
  'Senior AI Product Manager',
  'Scale AI',
  'GREENHOUSE',
  'https://boards.greenhouse.io/scaleai/jobs/example',
  'NEW',
  NULL,
  NULL,
  'AI Technical Product Manager',
  'AI/ML',
  'Senior',
  'Remote',
  '$160,000 - $190,000',
  ARRAY['Lead product roadmap for AI data labeling platform', 'Work with ML engineers on data quality features', 'Define API strategy for enterprise integrations'],
  ARRAY['5+ years product management experience', 'Experience with LLMs and ML systems', 'API product experience', 'B2B SaaS background'],
  ARRAY['Experience with data labeling or RLHF', 'Technical background in ML'],
  ARRAY['LLM', 'API', 'B2B SaaS', 'ML', 'data quality', 'enterprise', 'product roadmap']
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  company = EXCLUDED.company;

-- Adjacent fit job (should use adjacent_transition strategy)
INSERT INTO jobs (
  id,
  title,
  company,
  source,
  source_url,
  status,
  fit,
  score,
  role_family,
  industry_guess,
  seniority_level,
  location,
  salary_range,
  responsibilities,
  qualifications_required,
  qualifications_preferred,
  ats_keywords
) VALUES (
  'b0000001-0000-0000-0000-000000000002',
  'Product Manager - Developer Platform',
  'Stripe',
  'GREENHOUSE',
  'https://boards.greenhouse.io/stripe/jobs/example',
  'NEW',
  NULL,
  NULL,
  'Technical Product Manager',
  'FinTech',
  'Senior',
  'Remote',
  '$170,000 - $200,000',
  ARRAY['Own developer experience roadmap', 'Improve API documentation and SDKs', 'Reduce time-to-first-transaction for new users'],
  ARRAY['4+ years PM experience with developer tools', 'Strong technical empathy', 'Experience with payments or financial products', 'Analytical - comfortable with funnel metrics'],
  ARRAY['Prior experience at a developer-focused company', 'Engineering background'],
  ARRAY['developer experience', 'API', 'SDK', 'payments', 'fintech', 'developer tools', 'documentation']
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  company = EXCLUDED.company;

-- Weak fit job (should use stretch_honest or do_not_generate strategy)
INSERT INTO jobs (
  id,
  title,
  company,
  source,
  source_url,
  status,
  fit,
  score,
  role_family,
  industry_guess,
  seniority_level,
  location,
  salary_range,
  responsibilities,
  qualifications_required,
  qualifications_preferred,
  ats_keywords
) VALUES (
  'b0000001-0000-0000-0000-000000000003',
  'Director of Product - Consumer Mobile',
  'Instagram',
  'GREENHOUSE',
  'https://boards.greenhouse.io/meta/jobs/example',
  'NEW',
  NULL,
  NULL,
  'Product Manager',
  'Consumer Social',
  'Director',
  'Menlo Park, CA',
  '$250,000 - $350,000',
  ARRAY['Lead product strategy for Instagram Stories', 'Manage team of 8 PMs', 'Drive growth metrics for 2B+ MAU product'],
  ARRAY['10+ years product management experience', '5+ years people management', 'Consumer mobile product experience at scale', 'Experience with social media or content platforms'],
  ARRAY['Prior director-level experience', 'MBA preferred'],
  ARRAY['consumer mobile', 'social media', 'growth', 'people management', 'MAU', 'engagement', 'content']
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  company = EXCLUDED.company;

-- Output confirmation
SELECT 
  'Seeded ' || COUNT(*) || ' evidence records' as result
FROM evidence_library
WHERE id::text LIKE 'a0000001%';

SELECT 
  'Seeded ' || COUNT(*) || ' test jobs' as result
FROM jobs
WHERE id::text LIKE 'b0000001%';
