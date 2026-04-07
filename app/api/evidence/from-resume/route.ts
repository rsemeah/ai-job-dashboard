import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { mapResumeToEvidence, dedupeKey, type ParsedResume, type MappedEvidenceRow } from "@/lib/mapResumeToEvidence";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await req.json();
    const parsedResume = body?.parsedResume as ParsedResume | undefined;

    if (!parsedResume) {
      return NextResponse.json(
        { error: "parsedResume is required" },
        { status: 400 }
      );
    }

    let userId: string | undefined;
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      userId = user.id;
    } else {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) userId = session.user.id;
    }
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Delete existing resume-derived evidence before re-inserting
    // (includes work_experience, education, skill, certification, project)
    await supabase
      .from("evidence_library")
      .delete()
      .eq("user_id", userId)
      .in("source_type", ["work_experience", "education", "skill", "certification", "project"]);

    // Map resume to evidence rows (this now includes certifications, skills, projects)
    const mappedRows = mapResumeToEvidence(parsedResume);
    
    // Add user_id to each row for insert
    const evidenceRows = mappedRows.map(row => ({
      ...row,
      user_id: userId,
    }));

    if (evidenceRows.length === 0) {
      return NextResponse.json(
        { error: "No evidence rows could be derived from resume. Please ensure your resume has work experience, education, or skills." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("evidence_library")
      .insert(evidenceRows)
      .select("id");

    if (error) {
      console.error("[api/evidence/from-resume] insert failed", error);
      return NextResponse.json(
        { error: `Failed to save evidence: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      createdCount: data?.length ?? 0,
    });
  } catch (error) {
    console.error("[api/evidence/from-resume] unexpected error", error);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
