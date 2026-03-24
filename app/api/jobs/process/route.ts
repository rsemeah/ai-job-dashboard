import { createAdminClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { generateText } from "ai"
import { createGroq } from "@ai-sdk/groq"

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
})

// Full-auto job processing pipeline
// 1. Fetch job description from URL
// 2. Extract structured job data
// 3. Match against user profile  
// 4. Generate score
// 5. Generate resume and cover letter
// 6. Mark as READY_TO_APPLY

export async function POST(request: Request) {
  const supabase = createAdminClient()
  
  try {
    const { jobId } = await request.json()
    
    if (!jobId) {
      return NextResponse.json({ error: "Job ID required" }, { status: 400 })
    }

    // Get the job
    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .select("*")
      .eq("id", jobId)
      .single()

    if (jobError || !job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 })
    }

    // Get user profile
    const { data: profile } = await supabase
      .from("user_profile")
      .select("*")
      .limit(1)
      .single()

    // Step 1: If we have source_url but no description, try to summarize
    let jobDescription = job.raw_description || ""
    
    // Step 2: Extract structured data from job
    let extractedData = null
    if (jobDescription || job.title) {
      try {
        const { text } = await generateText({
          model: groq("llama-3.3-70b-versatile"),
          prompt: `Extract job requirements. Return ONLY valid JSON.

JOB: ${job.title} at ${job.company}
DESCRIPTION: ${jobDescription || "No description provided"}

Return JSON:
{
  "required_skills": ["skill1", "skill2"],
  "preferred_skills": ["skill1"],
  "responsibilities": ["resp1", "resp2"],
  "qualifications": ["qual1"],
  "experience_years": 3,
  "education_requirement": "Bachelor's degree",
  "keywords": ["keyword1", "keyword2"]
}

JSON only:`,
        })

        const jsonMatch = text.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          extractedData = JSON.parse(jsonMatch[0])
        }
      } catch (e) {
        console.error("Extract error:", e)
      }
    }

    // Step 3: Score the job against profile
    let score = 50 // Default score
    let fit = "MEDIUM"
    let strengths: string[] = []
    let gaps: string[] = []
    let reasoning = "Basic analysis completed"

    if (profile && profile.skills?.length > 0) {
      try {
        const { text } = await generateText({
          model: groq("llama-3.3-70b-versatile"),
          prompt: `Score job fit. Return ONLY valid JSON.

JOB: ${job.title} at ${job.company}
Required: ${extractedData?.required_skills?.join(", ") || job.title}

CANDIDATE:
Skills: ${profile.skills?.join(", ") || "None listed"}
Experience: ${profile.experience?.map((e: { title: string; company: string }) => `${e.title} at ${e.company}`).join("; ") || "None listed"}

Return JSON:
{
  "score": 75,
  "fit": "HIGH",
  "strengths": ["strength1", "strength2", "strength3"],
  "gaps": ["gap1"],
  "reasoning": "Brief explanation"
}

JSON only:`,
        })

        const jsonMatch = text.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const matchData = JSON.parse(jsonMatch[0])
          score = matchData.score || 50
          fit = matchData.fit || (score >= 70 ? "HIGH" : score >= 40 ? "MEDIUM" : "LOW")
          strengths = matchData.strengths || []
          gaps = matchData.gaps || []
          reasoning = matchData.reasoning || "Analysis completed"
        }
      } catch (e) {
        console.error("Score error:", e)
      }
    }

    // Step 4: Generate tailored resume
    let generatedResume = null
    if (profile && profile.summary) {
      try {
        const { text: resume } = await generateText({
          model: groq("llama-3.3-70b-versatile"),
          prompt: `Create a tailored ATS-optimized resume.

JOB: ${job.title} at ${job.company}
Required Skills: ${extractedData?.required_skills?.join(", ") || "General skills"}

CANDIDATE:
Name: ${profile.full_name || "Professional"}
Email: ${profile.email || ""}
Phone: ${profile.phone || ""}
Location: ${profile.location || ""}
Summary: ${profile.summary}
Skills: ${profile.skills?.join(", ") || "Various skills"}
Experience:
${profile.experience?.map((exp: { title: string; company: string; start_date: string; end_date: string; description: string }) => 
  `- ${exp.title} at ${exp.company} (${exp.start_date} - ${exp.end_date}): ${exp.description}`
).join("\n") || "Experience to be discussed"}
Education:
${profile.education?.map((edu: { degree: string; school: string; year: string }) => 
  `- ${edu.degree} from ${edu.school} (${edu.year})`
).join("\n") || "Education to be discussed"}

MATCH GUIDANCE:
Highlight: ${strengths.join(", ") || "Relevant experience"}
Address: ${gaps.join(", ") || "Growth areas"}

Create a professional resume with:
- Contact info header
- Professional summary tailored to this role
- Skills section with relevant keywords
- Work experience with achievements
- Education

Plain text, clear formatting:`,
        })
        generatedResume = resume
      } catch (e) {
        console.error("Resume error:", e)
      }
    }

    // Step 5: Generate cover letter
    let generatedCoverLetter = null
    if (profile) {
      try {
        const { text: coverLetter } = await generateText({
          model: groq("llama-3.3-70b-versatile"),
          prompt: `Write a compelling cover letter.

JOB: ${job.title} at ${job.company}
CANDIDATE: ${profile.full_name || "Applicant"}
BACKGROUND: ${profile.summary || "Experienced professional"}
KEY SKILLS: ${profile.skills?.join(", ") || "Various skills"}
STRENGTHS FOR THIS ROLE: ${strengths.join(", ") || "Relevant experience"}

Write 3-4 paragraphs:
1. Strong opening with enthusiasm for the role
2. Connect experience to requirements  
3. Specific value you'll bring
4. Call to action

Professional but personable. Plain text:`,
        })
        generatedCoverLetter = coverLetter
      } catch (e) {
        console.error("Cover letter error:", e)
      }
    }

    // Step 6: Update the job with all data
    const newStatus = score >= 60 ? "READY_TO_APPLY" : "SCORED"
    
    const { error: updateError } = await supabase
      .from("jobs")
      .update({
        status: newStatus,
        score,
        fit,
        extracted_data: extractedData,
        match_data: { score, fit, strengths, gaps, reasoning },
        score_reasoning: { text: reasoning },
        score_strengths: strengths,
        score_gaps: gaps,
        keywords_extracted: extractedData?.keywords || extractedData?.required_skills || [],
        generated_resume: generatedResume,
        generated_cover_letter: generatedCoverLetter,
        scored_at: new Date().toISOString(),
      })
      .eq("id", jobId)

    if (updateError) {
      console.error("Update error:", updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      score,
      fit,
      status: newStatus,
      hasResume: !!generatedResume,
      hasCoverLetter: !!generatedCoverLetter,
    })

  } catch (error) {
    console.error("Process job error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Processing failed" },
      { status: 500 }
    )
  }
}
