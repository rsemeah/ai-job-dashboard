import type { 
  Job, 
  GeneratedDocument, 
  Application, 
  WorkflowLog, 
  ReadyQueueItem,
  Settings 
} from './types'

export const mockJobs: Job[] = [
  {
    id: '1',
    title: 'Senior Software Engineer',
    company: 'TechCorp Inc',
    source: 'JOBOT',
    source_url: 'https://jobot.com/jobs/123',
    raw_description: `We are looking for a Senior Software Engineer to join our team.

**Responsibilities:**
- Design and implement scalable backend systems
- Lead technical discussions and code reviews
- Mentor junior engineers
- Collaborate with product and design teams

**Requirements:**
- 5+ years of experience with TypeScript/JavaScript
- Experience with React and Node.js
- Strong understanding of distributed systems
- Excellent communication skills

**Benefits:**
- Competitive salary ($180k-$220k)
- Remote-first culture
- Unlimited PTO
- Health, dental, and vision insurance`,
    location: 'San Francisco, CA',
    salary_range: '$180,000 - $220,000',
    is_remote: true,
    status: 'READY_TO_APPLY',
    fit: 'HIGH',
    score: 92,
    score_reasoning: {
      overall: 'Strong match based on technical skills and experience level',
      technical_match: 0.95,
      experience_match: 0.90,
      culture_fit: 0.88
    },
    score_strengths: [
      'Strong TypeScript/JavaScript experience matches requirements',
      'React and Node.js expertise aligns perfectly',
      'Remote work preference matches company culture',
      'Salary range within expectations'
    ],
    score_gaps: [
      'No specific distributed systems projects mentioned',
      'Leadership experience could be more prominent'
    ],
    keywords_extracted: ['TypeScript', 'React', 'Node.js', 'distributed systems', 'remote'],
    created_at: '2024-01-15T10:30:00Z',
    scored_at: '2024-01-15T10:35:00Z',
    applied_at: null
  },
  {
    id: '2',
    title: 'Full Stack Developer',
    company: 'StartupXYZ',
    source: 'GREENHOUSE',
    source_url: 'https://boards.greenhouse.io/startupxyz/jobs/456',
    raw_description: `Join our fast-growing startup as a Full Stack Developer!

**About the Role:**
Build and maintain our customer-facing web application. Work directly with founders.

**Tech Stack:**
- Frontend: React, Next.js, Tailwind CSS
- Backend: Python, FastAPI, PostgreSQL
- Infrastructure: AWS, Docker, Kubernetes

**What We Offer:**
- Equity package
- Flexible hours
- Learning budget`,
    location: 'New York, NY',
    salary_range: '$140,000 - $170,000',
    is_remote: false,
    status: 'SCORED',
    fit: 'MEDIUM',
    score: 75,
    score_reasoning: {
      overall: 'Good technical match but Python backend is a gap',
      technical_match: 0.70,
      experience_match: 0.80,
      culture_fit: 0.75
    },
    score_strengths: [
      'React and Next.js experience is a strong match',
      'Startup experience could be valuable',
      'Frontend skills align well'
    ],
    score_gaps: [
      'Python/FastAPI experience not demonstrated',
      'Kubernetes experience limited',
      'Not remote - requires relocation consideration'
    ],
    keywords_extracted: ['React', 'Next.js', 'Python', 'FastAPI', 'PostgreSQL', 'AWS', 'Kubernetes'],
    created_at: '2024-01-14T14:20:00Z',
    scored_at: '2024-01-14T14:25:00Z',
    applied_at: null
  },
  {
    id: '3',
    title: 'Frontend Engineer',
    company: 'DesignStudio',
    source: 'ZIPRECRUITER',
    source_url: 'https://ziprecruiter.com/jobs/789',
    raw_description: `DesignStudio is hiring a Frontend Engineer to work on our design tools platform.

**Requirements:**
- 3+ years React experience
- Strong CSS/Tailwind skills
- Animation experience (Framer Motion, GSAP)
- Eye for design

**Perks:**
- Creative environment
- Design tool subscriptions
- Conference budget`,
    location: 'Austin, TX',
    salary_range: '$120,000 - $150,000',
    is_remote: true,
    status: 'NEW',
    fit: 'UNSCORED',
    score: null,
    score_reasoning: null,
    score_strengths: null,
    score_gaps: null,
    keywords_extracted: null,
    created_at: '2024-01-16T09:00:00Z',
    scored_at: null,
    applied_at: null
  },
  {
    id: '4',
    title: 'Staff Engineer',
    company: 'BigTech Global',
    source: 'MANUAL',
    source_url: 'https://careers.bigtech.com/staff-eng',
    raw_description: `Staff Engineer position in our Platform team.

**Scope:**
- Architect systems serving 100M+ users
- Drive technical strategy across multiple teams
- Establish best practices and standards
- Hire and develop engineering talent

**Requirements:**
- 8+ years software engineering experience
- Track record of leading large-scale projects
- Strong system design skills
- Experience with cloud platforms`,
    location: 'Seattle, WA',
    salary_range: '$250,000 - $350,000',
    is_remote: true,
    status: 'APPLIED',
    fit: 'HIGH',
    score: 88,
    score_reasoning: {
      overall: 'Excellent match for senior technical leadership role',
      technical_match: 0.85,
      experience_match: 0.92,
      culture_fit: 0.87
    },
    score_strengths: [
      'Leadership experience aligns with Staff role',
      'System design skills demonstrated',
      'Cloud platform experience matches'
    ],
    score_gaps: [
      'Experience level slightly below 8 years',
      'No specific 100M+ user experience'
    ],
    keywords_extracted: ['system design', 'cloud', 'leadership', 'platform', 'architecture'],
    created_at: '2024-01-10T08:00:00Z',
    scored_at: '2024-01-10T08:10:00Z',
    applied_at: '2024-01-12T16:30:00Z'
  },
  {
    id: '5',
    title: 'React Developer',
    company: 'AgencyPro',
    source: 'JOBOT',
    source_url: 'https://jobot.com/jobs/321',
    raw_description: `Agency seeking React Developer for client projects.

**Day to Day:**
- Build React applications for various clients
- Work with designers on implementation
- Maintain existing codebases

**Must Have:**
- React, Redux, TypeScript
- CSS/SCSS expertise
- Agency experience preferred`,
    location: 'Remote',
    salary_range: '$100,000 - $130,000',
    is_remote: true,
    status: 'REJECTED',
    fit: 'LOW',
    score: 55,
    score_reasoning: {
      overall: 'Below target salary and agency work not preferred',
      technical_match: 0.80,
      experience_match: 0.60,
      culture_fit: 0.40
    },
    score_strengths: [
      'React and TypeScript skills match'
    ],
    score_gaps: [
      'Salary below target range',
      'Agency work style not preferred',
      'Limited growth opportunity'
    ],
    keywords_extracted: ['React', 'Redux', 'TypeScript', 'CSS', 'agency'],
    created_at: '2024-01-13T11:00:00Z',
    scored_at: '2024-01-13T11:05:00Z',
    applied_at: null
  },
  {
    id: '6',
    title: 'Principal Engineer',
    company: 'FinanceApp',
    source: 'GREENHOUSE',
    source_url: 'https://boards.greenhouse.io/financeapp/jobs/999',
    raw_description: `Principal Engineer to lead our payments infrastructure team.

**Impact:**
- Own the technical vision for payments
- Scale systems to handle $1B+ transactions
- Build and lead a team of 8 engineers

**Requirements:**
- 10+ years experience
- Fintech or payments background
- Strong security mindset`,
    location: 'San Francisco, CA',
    salary_range: '$280,000 - $380,000',
    is_remote: false,
    status: 'INTERVIEW',
    fit: 'HIGH',
    score: 85,
    score_reasoning: {
      overall: 'Strong technical match, location requires consideration',
      technical_match: 0.88,
      experience_match: 0.82,
      culture_fit: 0.85
    },
    score_strengths: [
      'Technical leadership experience',
      'Systems scaling experience',
      'Excellent compensation package'
    ],
    score_gaps: [
      'No direct fintech experience',
      'On-site requirement in SF'
    ],
    keywords_extracted: ['payments', 'fintech', 'infrastructure', 'security', 'leadership'],
    created_at: '2024-01-08T15:00:00Z',
    scored_at: '2024-01-08T15:10:00Z',
    applied_at: '2024-01-09T10:00:00Z'
  },
  {
    id: '7',
    title: 'Backend Engineer',
    company: 'DataCo',
    source: 'ZIPRECRUITER',
    source_url: 'https://ziprecruiter.com/jobs/backend-555',
    raw_description: `Backend Engineer for our data pipeline team.

**Stack:**
- Go, Python
- Apache Kafka, Spark
- PostgreSQL, Redis
- AWS/GCP

**Nice to Have:**
- ML/Data Science exposure
- Real-time systems experience`,
    location: 'Denver, CO',
    salary_range: '$150,000 - $190,000',
    is_remote: true,
    status: 'READY_TO_APPLY',
    fit: 'MEDIUM',
    score: 72,
    score_reasoning: {
      overall: 'Good backend fit but Go experience is limited',
      technical_match: 0.68,
      experience_match: 0.75,
      culture_fit: 0.73
    },
    score_strengths: [
      'Python experience matches',
      'Database skills align',
      'Remote friendly'
    ],
    score_gaps: [
      'Go experience not demonstrated',
      'Kafka/Spark experience limited'
    ],
    keywords_extracted: ['Go', 'Python', 'Kafka', 'Spark', 'PostgreSQL', 'Redis'],
    created_at: '2024-01-15T16:00:00Z',
    scored_at: '2024-01-15T16:10:00Z',
    applied_at: null
  },
  {
    id: '8',
    title: 'Engineering Manager',
    company: 'ScaleUp Inc',
    source: 'MANUAL',
    source_url: 'https://scaleup.com/careers/em',
    raw_description: `Engineering Manager to lead our Growth team.

**Responsibilities:**
- Manage team of 6 engineers
- Drive quarterly OKRs
- Partner with Product and Design
- Hands-on coding 30% of time

**Looking For:**
- 2+ years management experience
- Strong technical background
- Growth mindset`,
    location: 'Boston, MA',
    salary_range: '$200,000 - $250,000',
    is_remote: true,
    status: 'OFFER',
    fit: 'HIGH',
    score: 90,
    score_reasoning: {
      overall: 'Excellent match for hybrid IC/Manager role',
      technical_match: 0.88,
      experience_match: 0.92,
      culture_fit: 0.90
    },
    score_strengths: [
      'Management experience aligns',
      'Technical skills allow hands-on work',
      'Growth team experience relevant'
    ],
    score_gaps: [
      'Boston timezone may require some adjustment'
    ],
    keywords_extracted: ['management', 'growth', 'OKRs', 'product', 'technical leadership'],
    created_at: '2024-01-05T09:00:00Z',
    scored_at: '2024-01-05T09:15:00Z',
    applied_at: '2024-01-06T14:00:00Z'
  }
]

export const mockGeneratedDocuments: GeneratedDocument[] = [
  {
    id: 'doc-1',
    job_id: '1',
    doc_type: 'RESUME',
    content: `JOHN DOE
Senior Software Engineer
john.doe@email.com | (555) 123-4567 | San Francisco, CA

SUMMARY
Experienced Senior Software Engineer with 6+ years building scalable web applications using TypeScript, React, and Node.js. Proven track record of leading technical initiatives and mentoring engineering teams.

EXPERIENCE

Senior Software Engineer | CurrentCompany | 2021 - Present
• Led development of microservices architecture serving 2M+ daily active users
• Mentored team of 4 junior engineers, improving code quality metrics by 40%
• Architected real-time notification system using WebSockets and Redis
• Reduced API response times by 60% through query optimization

Software Engineer | PreviousCompany | 2018 - 2021
• Built React component library used across 5 product teams
• Implemented CI/CD pipeline reducing deployment time from 2 hours to 15 minutes
• Developed Node.js backend services handling 10K requests/second

SKILLS
TypeScript, JavaScript, React, Node.js, PostgreSQL, Redis, AWS, Docker, Kubernetes

EDUCATION
B.S. Computer Science | University of California, Berkeley | 2018`,
    model_used: 'gpt-4',
    prompt_version: 'v2.3'
  },
  {
    id: 'doc-2',
    job_id: '1',
    doc_type: 'COVER_LETTER',
    content: `Dear Hiring Manager,

I am writing to express my strong interest in the Senior Software Engineer position at TechCorp Inc. With over 6 years of experience building scalable applications using TypeScript, React, and Node.js, I am confident I would be a valuable addition to your team.

In my current role, I have led the development of microservices architecture that serves over 2 million daily active users. I have a passion for mentoring junior engineers and have successfully improved our team's code quality metrics by 40% through code reviews and pair programming sessions.

What excites me most about TechCorp is your commitment to remote-first culture and your focus on distributed systems. I have extensive experience with these challenges and would love to bring my expertise to your platform.

I would welcome the opportunity to discuss how my background in building scalable systems and leading technical teams could benefit TechCorp Inc.

Best regards,
John Doe`,
    model_used: 'gpt-4',
    prompt_version: 'v2.3'
  },
  {
    id: 'doc-3',
    job_id: '1',
    doc_type: 'APPLICATION_ANSWERS',
    content: `Q: Why are you interested in this role?
A: I am drawn to TechCorp's mission of building scalable developer tools. The technical challenges around distributed systems align perfectly with my experience and interests. I'm particularly excited about the remote-first culture and the opportunity to work with a team that values technical excellence.

Q: Describe a challenging technical problem you solved.
A: At my current company, I led the migration from a monolithic architecture to microservices. The challenge was maintaining zero downtime while serving 2M+ daily users. I implemented a strangler fig pattern, gradually routing traffic to new services while keeping the monolith operational. The migration took 6 months and resulted in 60% faster deployments and improved system reliability.

Q: What's your experience with distributed systems?
A: I have designed and implemented several distributed systems including a real-time notification service using WebSockets, Redis pub/sub, and Kafka for event streaming. I've also worked extensively with microservices patterns including service discovery, circuit breakers, and distributed tracing.`,
    model_used: 'gpt-4',
    prompt_version: 'v2.3'
  },
  {
    id: 'doc-4',
    job_id: '4',
    doc_type: 'RESUME',
    content: `JOHN DOE
Staff Software Engineer
john.doe@email.com | (555) 123-4567 | San Francisco, CA

SUMMARY
Technical leader with 6+ years of experience architecting and scaling complex systems. Proven ability to drive technical strategy and mentor engineering teams.

[Full resume content tailored for Staff Engineer role...]`,
    model_used: 'gpt-4',
    prompt_version: 'v2.3'
  },
  {
    id: 'doc-5',
    job_id: '4',
    doc_type: 'COVER_LETTER',
    content: `Dear Hiring Team,

I am excited to apply for the Staff Engineer position at BigTech Global...

[Full cover letter for Staff Engineer role...]`,
    model_used: 'gpt-4',
    prompt_version: 'v2.3'
  },
  {
    id: 'doc-6',
    job_id: '7',
    doc_type: 'RESUME',
    content: `JOHN DOE
Backend Engineer
john.doe@email.com | (555) 123-4567

[Resume tailored for Backend/Data Pipeline role...]`,
    model_used: 'gpt-4',
    prompt_version: 'v2.3'
  },
  {
    id: 'doc-7',
    job_id: '7',
    doc_type: 'COVER_LETTER',
    content: `Dear DataCo Team,

I am writing to apply for the Backend Engineer position...

[Cover letter for Backend Engineer role...]`,
    model_used: 'gpt-4',
    prompt_version: 'v2.3'
  }
]

export const mockApplications: Application[] = [
  {
    id: 'app-1',
    job_id: '4',
    submitted_at: '2024-01-12T16:30:00Z',
    submission_method: 'MANUAL',
    portal_url: 'https://careers.bigtech.com/apply',
    confirmation_code: 'BT-2024-5678',
    response_received: true,
    response_date: '2024-01-14T10:00:00Z',
    interview_date: null,
    interview_type: null
  },
  {
    id: 'app-2',
    job_id: '6',
    submitted_at: '2024-01-09T10:00:00Z',
    submission_method: 'MANUAL',
    portal_url: 'https://boards.greenhouse.io/financeapp/apply',
    confirmation_code: 'FA-98765',
    response_received: true,
    response_date: '2024-01-11T14:30:00Z',
    interview_date: '2024-01-20T15:00:00Z',
    interview_type: 'VIDEO'
  },
  {
    id: 'app-3',
    job_id: '8',
    submitted_at: '2024-01-06T14:00:00Z',
    submission_method: 'EMAIL',
    portal_url: null,
    confirmation_code: null,
    response_received: true,
    response_date: '2024-01-08T09:00:00Z',
    interview_date: '2024-01-15T11:00:00Z',
    interview_type: 'ONSITE'
  }
]

export const mockWorkflowLogs: WorkflowLog[] = [
  {
    id: 'log-1',
    job_id: '1',
    workflow_name: 'job_scoring',
    step_name: 'extract_keywords',
    status: 'SUCCESS',
    error_message: null,
    created_at: '2024-01-15T10:31:00Z'
  },
  {
    id: 'log-2',
    job_id: '1',
    workflow_name: 'job_scoring',
    step_name: 'calculate_fit_score',
    status: 'SUCCESS',
    error_message: null,
    created_at: '2024-01-15T10:32:00Z'
  },
  {
    id: 'log-3',
    job_id: '1',
    workflow_name: 'document_generation',
    step_name: 'generate_resume',
    status: 'SUCCESS',
    error_message: null,
    created_at: '2024-01-15T10:33:00Z'
  },
  {
    id: 'log-4',
    job_id: '1',
    workflow_name: 'document_generation',
    step_name: 'generate_cover_letter',
    status: 'SUCCESS',
    error_message: null,
    created_at: '2024-01-15T10:34:00Z'
  },
  {
    id: 'log-5',
    job_id: '2',
    workflow_name: 'job_scoring',
    step_name: 'extract_keywords',
    status: 'SUCCESS',
    error_message: null,
    created_at: '2024-01-14T14:21:00Z'
  },
  {
    id: 'log-6',
    job_id: '2',
    workflow_name: 'job_scoring',
    step_name: 'calculate_fit_score',
    status: 'SUCCESS',
    error_message: null,
    created_at: '2024-01-14T14:22:00Z'
  },
  {
    id: 'log-7',
    job_id: '3',
    workflow_name: 'job_ingestion',
    step_name: 'fetch_description',
    status: 'SUCCESS',
    error_message: null,
    created_at: '2024-01-16T09:01:00Z'
  },
  {
    id: 'log-8',
    job_id: '3',
    workflow_name: 'job_scoring',
    step_name: 'extract_keywords',
    status: 'ERROR',
    error_message: 'OpenAI API rate limit exceeded. Retry after 60 seconds.',
    created_at: '2024-01-16T09:02:00Z'
  },
  {
    id: 'log-9',
    job_id: '5',
    workflow_name: 'job_scoring',
    step_name: 'calculate_fit_score',
    status: 'SUCCESS',
    error_message: null,
    created_at: '2024-01-13T11:06:00Z'
  },
  {
    id: 'log-10',
    job_id: '7',
    workflow_name: 'document_generation',
    step_name: 'generate_resume',
    status: 'ERROR',
    error_message: 'Template rendering failed: missing required field "years_of_experience"',
    created_at: '2024-01-15T16:15:00Z'
  },
  {
    id: 'log-11',
    job_id: '7',
    workflow_name: 'document_generation',
    step_name: 'generate_resume',
    status: 'SUCCESS',
    error_message: null,
    created_at: '2024-01-15T16:20:00Z'
  }
]

export const mockReadyQueue: ReadyQueueItem[] = mockJobs
  .filter(job => job.status === 'READY_TO_APPLY')
  .map(job => ({
    id: job.id,
    title: job.title,
    company: job.company,
    score: job.score!,
    fit: job.fit,
    docs_generated_count: mockGeneratedDocuments.filter(doc => doc.job_id === job.id).length
  }))

export const mockSettings: Settings = {
  active_resume: 'base_resume_v3.pdf',
  score_threshold: 70,
  source_toggles: {
    JOBOT: true,
    ZIPRECRUITER: true,
    GREENHOUSE: true,
    MANUAL: true
  }
}

// Helper functions
export function getJobById(id: string): Job | undefined {
  return mockJobs.find(job => job.id === id)
}

export function getDocumentsForJob(jobId: string): GeneratedDocument[] {
  return mockGeneratedDocuments.filter(doc => doc.job_id === jobId)
}

export function getApplicationForJob(jobId: string): Application | undefined {
  return mockApplications.find(app => app.job_id === jobId)
}

export function getLogsForJob(jobId: string): WorkflowLog[] {
  return mockWorkflowLogs.filter(log => log.job_id === jobId)
}

export function getJobWithRelations(id: string) {
  const job = getJobById(id)
  if (!job) return null
  
  return {
    ...job,
    documents: getDocumentsForJob(id),
    application: getApplicationForJob(id),
    logs: getLogsForJob(id)
  }
}
