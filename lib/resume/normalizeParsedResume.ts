import type { ParsedResumeData, ParsedResumeExperience, ParsedResumeEducation } from "@/types/resume";

type AnyObject = Record<string, unknown>;

function normalizeExperience(exp: AnyObject): ParsedResumeExperience {
  const dates = (exp?.dates ?? {}) as Record<string, unknown>;
  const startDate =
    (exp?.startDate as string) ??
    (exp?.start_date as string) ??
    (dates?.start as string) ??
    (dates?.from as string) ??
    null;

  const endDate =
    (exp?.endDate as string) ??
    (exp?.end_date as string) ??
    (dates?.end as string) ??
    (dates?.to as string) ??
    null;

  return {
    title: (exp?.title as string) ?? (exp?.role as string) ?? "",
    company: (exp?.company as string) ?? (exp?.organization as string) ?? "",
    location: (exp?.location as string) ?? null,
    startDate,
    endDate,
    isCurrent:
      (exp?.isCurrent as boolean) ??
      (exp?.current as boolean) ??
      (endDate === "Present" || endDate === "Current") ??
      false,
    description: (exp?.description as string) ?? null,
    bullets: Array.isArray(exp?.bullets)
      ? (exp.bullets as string[]).filter(Boolean)
      : Array.isArray(exp?.highlights)
      ? (exp.highlights as string[]).filter(Boolean)
      : [],
  };
}

export function normalizeParsedResume(input: AnyObject): ParsedResumeData {
  return {
    fullName: (input?.fullName as string) ?? (input?.name as string) ?? null,
    email: (input?.email as string) ?? null,
    phone: (input?.phone as string) ?? null,
    location: (input?.location as string) ?? null,
    summary: (input?.summary as string) ?? (input?.professionalSummary as string) ?? null,
    experience: Array.isArray(input?.experience)
      ? (input.experience as AnyObject[]).map(normalizeExperience).filter(
          (exp: ParsedResumeExperience) => exp.title || exp.company || (exp.bullets?.length ?? 0) > 0
        )
      : [],
    education: Array.isArray(input?.education) ? (input.education as ParsedResumeEducation[]) : [],
    skills: Array.isArray(input?.skills)
      ? (input.skills as unknown[]).map((skill: unknown) =>
          typeof skill === "string" ? { name: skill } : (skill as { name: string; category?: string | null })
        )
      : [],
    certifications: Array.isArray(input?.certifications) ? (input.certifications as string[]) : [],
    rawText: (input?.rawText as string) ?? null,
  };
}


