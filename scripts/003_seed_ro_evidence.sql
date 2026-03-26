-- Seed Ro's core evidence library projects

-- Clear existing evidence for clean seed
DELETE FROM evidence_library WHERE is_active = true;

-- HireWire
INSERT INTO evidence_library (
  source_type, source_title, source_url, project_name, role_name, company_name,
  date_range, industries, role_family_tags, responsibilities, tools_used,
  systems_used, workflows_created, outcomes, proof_snippet,
  approved_keywords, approved_achievement_bullets,
  confidence_level, is_user_approved, visibility_status, evidence_weight,
  user_problem, business_goal, what_shipped, what_visible, what_not_to_overstate, is_active
) VALUES (
  'project',
  'HireWire - AI Career Operating System',
  'https://hirewire.app',
  'HireWire',
  'Product Owner / Technical Lead',
  'RedLantern Studios',
  '2024-Present',
  ARRAY['AI', 'Career Tech', 'SaaS', 'Workflow Automation'],
  ARRAY['AI Technical Product Manager', 'Technical Product Manager', 'AI Product Manager', 'Product Manager'],
  ARRAY['Defined product vision and architecture for AI-powered job search system', 'Designed job intake, analysis, and material generation workflows', 'Built evidence-based resume and cover letter generation', 'Created decision support UI for job fit assessment'],
  ARRAY['Next.js', 'Supabase', 'Groq', 'TypeScript', 'Tailwind CSS'],
  ARRAY['Job analysis pipeline', 'Document generation system', 'Evidence library', 'Quality gate'],
  ARRAY['Job URL intake to analysis', 'Profile-to-job matching', 'ATS-safe material generation'],
  ARRAY['Built end-to-end AI career system from concept to working product', 'Designed evidence-grounded document generation'],
  'Live product with full job analysis, scoring, and material generation pipeline',
  ARRAY['AI product', 'career tech', 'workflow automation', 'document generation', 'ATS optimization'],
  ARRAY['Built AI career operating system that analyzes jobs and generates tailored application materials', 'Architected end-to-end workflow from job URL intake through ATS-optimized resume generation'],
  'high', true, 'active', 'highest',
  'Job seekers spend hours tailoring resumes without real evidence backing',
  'Create intelligent career system that grounds AI output in verified experience',
  'Working web application with job analysis and material generation',
  'Live at hirewire.app',
  'Do not overstate as enterprise-scale product',
  true
);

-- Authentic Hadith
INSERT INTO evidence_library (
  source_type, source_title, source_url, project_name, role_name, company_name,
  date_range, industries, role_family_tags, responsibilities, tools_used,
  systems_used, workflows_created, outcomes, proof_snippet,
  approved_keywords, approved_achievement_bullets,
  confidence_level, is_user_approved, visibility_status, evidence_weight,
  user_problem, business_goal, what_shipped, what_visible, what_not_to_overstate, is_active
) VALUES (
  'project',
  'Authentic Hadith - AI Islamic Study Platform',
  'https://authentichadith.com',
  'Authentic Hadith',
  'Product Owner / Technical Lead',
  'RedLantern Studios',
  '2024-Present',
  ARRAY['AI', 'EdTech', 'Religious Tech', 'Knowledge Systems'],
  ARRAY['AI Technical Product Manager', 'AI Product Manager', 'Product Manager'],
  ARRAY['Defined product strategy for AI-powered hadith study platform', 'Designed trust-focused AI explanation system', 'Built search and study experience', 'Planned subscription architecture'],
  ARRAY['Next.js', 'Supabase', 'AI/LLM', 'TypeScript', 'Stripe'],
  ARRAY['Search engine', 'AI explanation system', 'Subscription management'],
  ARRAY['Hadith search to explanation', 'User onboarding to subscription'],
  ARRAY['Created AI platform requiring precision for sensitive religious content', 'Built subscription-ready product'],
  'Live product with AI explanations for Islamic hadith study',
  ARRAY['AI platform', 'EdTech', 'religious tech', 'trust-focused AI', 'subscription'],
  ARRAY['Built AI-powered study platform requiring precision for sensitive religious content', 'Architected subscription-ready product with authentication and payments'],
  'high', true, 'active', 'highest',
  'Muslims need accessible hadith study resources that maintain accuracy',
  'Create trusted AI platform for Islamic knowledge',
  'Working web application with search and AI explanations',
  'Live at authentichadith.com',
  'Do not overstate AI accuracy claims or scholarly endorsement',
  true
);

-- TradeSwarm
INSERT INTO evidence_library (
  source_type, source_title, project_name, role_name, company_name,
  date_range, industries, role_family_tags, responsibilities, tools_used,
  systems_used, workflows_created, outcomes, proof_snippet,
  approved_keywords, approved_achievement_bullets,
  confidence_level, is_user_approved, visibility_status, evidence_weight,
  user_problem, business_goal, what_shipped, what_visible, what_not_to_overstate, is_active
) VALUES (
  'project',
  'TradeSwarm - AI Trading System Architecture',
  'TradeSwarm',
  'Product Architect / System Designer',
  'RedLantern Studios',
  '2024',
  ARRAY['AI', 'FinTech', 'Trading', 'Decision Support'],
  ARRAY['AI Technical Product Manager', 'Technical Product Manager', 'Systems Product Manager'],
  ARRAY['Designed complex AI trading system architecture', 'Created risk logic and decision replay capability', 'Architected audit trail system'],
  ARRAY['System Architecture', 'AI/ML Design', 'Risk Systems'],
  ARRAY['Trading signal pipeline', 'Risk assessment engine', 'Audit trail system'],
  ARRAY['Signal to trade decision', 'Risk assessment workflow'],
  ARRAY['Designed AI trading architecture with determinism and replay', 'Created risk logic for high-stakes decisions'],
  'Comprehensive architecture documentation',
  ARRAY['AI trading', 'FinTech', 'risk management', 'determinism', 'audit trail'],
  ARRAY['Architected AI trading system with determinism requirements and decision replay', 'Designed risk assessment logic for automated trading'],
  'high', true, 'active', 'high',
  'Automated trading needs deterministic auditable AI',
  'Create trustworthy AI trading system with accountability',
  'Architecture documentation and design specifications',
  'Architecture docs available',
  'Do not claim live trading deployment or financial results',
  true
);

-- Clarity
INSERT INTO evidence_library (
  source_type, source_title, project_name, role_name, company_name,
  date_range, industries, role_family_tags, responsibilities, tools_used,
  systems_used, workflows_created, outcomes, proof_snippet,
  approved_keywords, approved_achievement_bullets,
  confidence_level, is_user_approved, visibility_status, evidence_weight,
  user_problem, business_goal, what_shipped, what_visible, what_not_to_overstate, is_active
) VALUES (
  'project',
  'Clarity - Real Estate Intelligence Dashboard',
  'Clarity',
  'Product Owner',
  'RedLantern Studios',
  '2024',
  ARRAY['Real Estate', 'Analytics', 'Decision Support', 'Dashboard'],
  ARRAY['Product Manager', 'AI Product Manager', 'Analytics Product Manager'],
  ARRAY['Designed analytics dashboard for real estate intelligence', 'Created signal surfacing UI', 'Built data visualization'],
  ARRAY['Next.js', 'Data Visualization', 'Analytics'],
  ARRAY['Analytics dashboard', 'Signal detection', 'Market intelligence'],
  ARRAY['Data to insight surfacing', 'Alert workflow'],
  ARRAY['Built analytics dashboard that surfaces actionable signals', 'Designed decision support interface'],
  'Working dashboard with analytics and signal surfacing',
  ARRAY['analytics', 'dashboard', 'real estate', 'decision support', 'data visualization'],
  ARRAY['Built analytics dashboard that surfaces actionable market signals', 'Designed decision support interface that translates data into clear steps'],
  'high', true, 'active', 'high',
  'Real estate professionals need clear signals from complex data',
  'Create dashboard that makes market intelligence actionable',
  'Working dashboard application',
  'Demo available',
  'Do not overstate data sources or market coverage',
  true
);

-- PhonePop
INSERT INTO evidence_library (
  source_type, source_title, project_name, role_name, company_name,
  date_range, industries, role_family_tags, responsibilities, tools_used,
  systems_used, workflows_created, outcomes, proof_snippet,
  approved_keywords, approved_achievement_bullets,
  confidence_level, is_user_approved, visibility_status, evidence_weight,
  user_problem, business_goal, what_shipped, what_visible, what_not_to_overstate, is_active
) VALUES (
  'project',
  'PhonePop - Lead Processing Workflow',
  'PhonePop',
  'Product Owner / Technical Lead',
  'RedLantern Studios',
  '2024',
  ARRAY['Workflow Automation', 'Lead Management', 'AI', 'Business Tools'],
  ARRAY['Technical Product Manager', 'Product Manager', 'Workflow Product Manager'],
  ARRAY['Built lead parsing and generation workflow', 'Designed direct app-owned AI flow', 'Created practical business use case'],
  ARRAY['Next.js', 'AI/LLM', 'Workflow Automation'],
  ARRAY['Lead parsing', 'Script generation', 'Workflow compression'],
  ARRAY['Lead intake to call script', 'Raw text to structured data'],
  ARRAY['Built workflow that compresses lead processing from minutes to seconds', 'Created practical business tool'],
  'Working lead processing tool with immediate output',
  ARRAY['workflow automation', 'lead management', 'AI workflow', 'operator tools'],
  ARRAY['Built AI lead processing workflow that compresses tasks from minutes to seconds', 'Designed direct app-owned AI flow for reliable output'],
  'high', true, 'active', 'high',
  'Operators waste time on repetitive lead processing',
  'Create tool that instantly generates call scripts from leads',
  'Working lead processing application',
  'Demo available',
  'Do not overstate scale or deployment breadth',
  true
);

-- RedLantern Studios
INSERT INTO evidence_library (
  source_type, source_title, source_url, project_name, role_name, company_name,
  date_range, industries, role_family_tags, responsibilities, tools_used,
  systems_used, workflows_created, outcomes, proof_snippet,
  approved_keywords, approved_achievement_bullets,
  confidence_level, is_user_approved, visibility_status, evidence_weight,
  user_problem, business_goal, what_shipped, what_visible, what_not_to_overstate, is_active
) VALUES (
  'portfolio_entry',
  'RedLantern Studios - Product Development Studio',
  'https://redlanternstudios.com',
  'RedLantern Studios / byRed',
  'Founder / Product Lead',
  'RedLantern Studios',
  '2023-Present',
  ARRAY['Product Development', 'Consulting', 'Agency', 'AI'],
  ARRAY['Product Manager', 'Technical Product Manager', 'Founder', 'Product Lead'],
  ARRAY['Founded and operate product development studio', 'Lead cross-project orchestration', 'Maintain premium quality bar'],
  ARRAY['Multiple Tech Stacks', 'Product Strategy', 'Brand Development'],
  ARRAY['Project management', 'Client delivery', 'Brand systems'],
  ARRAY['Client intake to delivery', 'Project scoping to launch'],
  ARRAY['Built founder-led product development practice', 'Delivered multiple products maintaining premium standards'],
  'Active studio with multiple shipped products',
  ARRAY['founder', 'product development', 'consulting', 'agency', 'premium quality'],
  ARRAY['Founded product development studio delivering multiple AI and web products', 'Maintain premium quality bar across client-facing and internal products'],
  'high', true, 'active', 'highest',
  'Need for high-quality product development with ownership',
  'Build studio that delivers premium products with technical depth',
  'Active studio with portfolio of shipped products',
  'Live at redlanternstudios.com',
  'Do not overstate team size or enterprise client roster',
  true
);

-- rorysemeah.com
INSERT INTO evidence_library (
  source_type, source_title, source_url, project_name, role_name, company_name,
  date_range, industries, role_family_tags, responsibilities, tools_used,
  systems_used, workflows_created, outcomes, proof_snippet,
  approved_keywords, approved_achievement_bullets,
  confidence_level, is_user_approved, visibility_status, evidence_weight,
  user_problem, business_goal, what_shipped, what_visible, what_not_to_overstate, is_active
) VALUES (
  'portfolio_entry',
  'rorysemeah.com - Personal Portfolio',
  'https://rorysemeah.com',
  'Personal Portfolio',
  'Owner',
  'Personal',
  '2024-Present',
  ARRAY['Portfolio', 'Personal Brand'],
  ARRAY['Product Manager', 'Technical Product Manager'],
  ARRAY['Designed and built personal portfolio', 'Created clear positioning narrative'],
  ARRAY['Next.js', 'Web Development'],
  ARRAY['Portfolio site'],
  ARRAY['Portfolio showcase'],
  ARRAY['Created cohesive narrative connecting diverse product work', 'Built visible proof of cross-product ownership'],
  'Live portfolio site with project showcases',
  ARRAY['portfolio', 'personal brand', 'product showcase'],
  ARRAY['Built portfolio demonstrating cross-product ownership and technical product depth'],
  'high', true, 'active', 'highest',
  'Need clear positioning narrative across diverse products',
  'Create visible proof of body of work',
  'Live portfolio website',
  'Live at rorysemeah.com',
  'Portfolio is representation not overstatement',
  true
);

-- Update user_profile with Ro's positioning
UPDATE user_profile SET
  summary = 'AI Technical Product Manager with demonstrated ability to own products end-to-end—from concept through architecture, build, and launch. Strongest in AI-powered systems, workflow automation, and decision support products. Combines deep product thinking with technical fluency to drive system design, requirements, and cross-functional execution. Builder mindset with founder-style ownership.',
  skills = ARRAY[
    'Product Strategy',
    'AI/ML Product Development',
    'Technical Product Management',
    'System Architecture',
    'Workflow Design',
    'Requirements Definition',
    'Cross-functional Leadership',
    'Next.js',
    'Supabase',
    'AI Prompt Engineering',
    'Data Modeling',
    'UX Design Direction',
    'Agile/Scrum'
  ]
WHERE id IS NOT NULL;
