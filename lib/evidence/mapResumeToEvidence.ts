import type { ParsedResumeData } from "@/types/resume";

// Match the actual evidence_library table schema
export type EvidenceRow = {
  user_id: string;
  source_type: string;
  source_title: string;
  role_name: string | null;
  company_name: string | null;
  date_range: string | null;
  responsibilities: string[];
  outcomes: string[];
  proof_snippet: string | null;
  is_active: boolean;
  priority_rank: number;
  confidence_level: string;
  is_user_approved: boolean;
};

export function mapResumeToEvidence(
  parsedResume: ParsedResumeData,
  userId: string
): EvidenceRow[] {
  const experienceRows: EvidenceRow[] = (parsedResume.experience ?? []).map((exp, index) => {
    // Build date range string from start/end dates
    const dateRange = exp.startDate || exp.endDate
      ? `${exp.startDate || "?"} - ${exp.isCurrent ? "Present" : exp.endDate || "?"}`
      : null;

    return {
      user_id: userId,
      source_type: "work_experience",
      source_title: `${exp.title || "Role"} at ${exp.company || "Company"}`,
      role_name: exp.title || null,
      company_name: exp.company || null,
      date_range: dateRange,
      responsibilities: exp.bullets?.length ? exp.bullets : [],
      outcomes: [],
      proof_snippet: exp.description || (exp.bullets?.length ? exp.bullets.join(" ") : null),
      is_active: true,
      priority_rank: index,
      confidence_level: "high",
      is_user_approved: false,
    };
  });

  const educationRows: EvidenceRow[] = (parsedResume.education ?? []).map((edu, index) => ({
    user_id: userId,
    source_type: "education",
    source_title: `${edu.degree || "Degree"} from ${edu.school || "School"}`,
    role_name: edu.degree || edu.fieldOfStudy || null,
    company_name: edu.school || null,
    date_range: edu.graduationDate || null,
    responsibilities: [],
    outcomes: [],
    proof_snippet: edu.description || null,
    is_active: true,
    priority_rank: experienceRows.length + index,
    confidence_level: "high",
    is_user_approved: false,
  }));

  // Skills are less suitable for evidence_library format, so we skip them
  // Skills are better stored in user_profile.skills

  return [...experienceRows, ...educationRows].filter(
    (row) => row.role_name || row.company_name || row.proof_snippet || row.responsibilities.length > 0
  );
}
