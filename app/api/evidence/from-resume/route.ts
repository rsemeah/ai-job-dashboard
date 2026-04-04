import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { mapResumeToEvidence } from "@/lib/evidence/mapResumeToEvidence";
import type { ParsedResumeData } from "@/types/resume";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await req.json();
    const parsedResume = body?.parsedResume as ParsedResumeData | undefined;

    if (!parsedResume) {
      return NextResponse.json(
        { error: "parsedResume is required" },
        { status: 400 }
      );
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Delete existing resume-sourced evidence before inserting new ones
    // This prevents duplicate evidence on re-upload
    const { error: deleteError } = await supabase
      .from("evidence_library")
      .delete()
      .eq("user_id", user.id)
      .eq("source_type", "resume");

    if (deleteError) {
      console.error("[api/evidence/from-resume] delete existing failed", deleteError);
      // Continue anyway - insert may still work
    }

    const evidenceRows = mapResumeToEvidence(parsedResume, user.id);

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
