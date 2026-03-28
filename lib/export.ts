/**
 * HireWire Document Export Library
 * 
 * Exports structured documents to DOCX and PDF formats
 * Uses docx for Word documents and puppeteer-core for PDF
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  convertInchesToTwip,
  SectionType,
} from "docx"
import {
  StructuredResume,
  StructuredCoverLetter,
  ExportFormat,
  ExportResult,
} from "./document-types"

// ============================================================================
// DOCX EXPORT - RESUME
// ============================================================================

export async function exportResumeToDocx(resume: StructuredResume): Promise<ExportResult> {
  try {
    const children: Paragraph[] = []
    
    // Header - Name
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: resume.basics.name.toUpperCase(),
            bold: true,
            size: 28, // 14pt
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
      })
    )
    
    // Header - Contact info
    const contactParts = [
      resume.basics.location,
      resume.basics.email,
      resume.basics.phone,
    ].filter(Boolean)
    
    if (contactParts.length > 0) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: contactParts.join(" | "),
              size: 20, // 10pt
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
        })
      )
    }
    
    // Links row
    const linkParts = [
      resume.basics.linkedinUrl,
      resume.basics.githubUrl,
      resume.basics.portfolioUrl,
    ].filter(Boolean)
    
    if (linkParts.length > 0) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: linkParts.join(" | "),
              size: 18, // 9pt
              color: "0000EE",
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 300 },
        })
      )
    }
    
    // Summary Section
    if (resume.summary) {
      children.push(createSectionHeading("PROFESSIONAL SUMMARY"))
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: resume.summary,
              size: 22, // 11pt
            }),
          ],
          spacing: { after: 200 },
        })
      )
    }
    
    // Skills Section (for technical resumes)
    if (resume.skills.length > 0) {
      children.push(createSectionHeading("TECHNICAL SKILLS"))
      
      for (const group of resume.skills) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `${group.category}: `,
                bold: true,
                size: 22,
              }),
              new TextRun({
                text: group.skills.join(", "),
                size: 22,
              }),
            ],
            spacing: { after: 100 },
          })
        )
      }
      children.push(new Paragraph({ spacing: { after: 100 } }))
    }
    
    // Experience Section
    if (resume.experience.length > 0) {
      children.push(createSectionHeading("PROFESSIONAL EXPERIENCE"))
      
      for (const exp of resume.experience) {
        // Title and Company
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: exp.title,
                bold: true,
                size: 22,
              }),
              new TextRun({
                text: ` | ${exp.company}`,
                size: 22,
              }),
              new TextRun({
                text: exp.location ? ` | ${exp.location}` : "",
                size: 22,
              }),
            ],
            spacing: { after: 50 },
          })
        )
        
        // Date range
        const dateText = exp.isCurrent 
          ? `${exp.startDate} - Present`
          : `${exp.startDate} - ${exp.endDate || ""}`
        
        if (exp.startDate) {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: dateText,
                  italics: true,
                  size: 20,
                }),
              ],
              spacing: { after: 100 },
            })
          )
        }
        
        // Bullets
        for (const bullet of exp.bullets) {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `• ${bullet.text}`,
                  size: 22,
                }),
              ],
              indent: { left: convertInchesToTwip(0.25) },
              spacing: { after: 50 },
            })
          )
        }
        
        children.push(new Paragraph({ spacing: { after: 150 } }))
      }
    }
    
    // Projects Section
    if (resume.projects && resume.projects.length > 0) {
      children.push(createSectionHeading("PROJECTS"))
      
      for (const project of resume.projects) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: project.title,
                bold: true,
                size: 22,
              }),
              new TextRun({
                text: ` | ${project.techStack.join(", ")}`,
                size: 20,
              }),
            ],
            spacing: { after: 50 },
          })
        )
        
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `• ${project.description}`,
                size: 22,
              }),
            ],
            indent: { left: convertInchesToTwip(0.25) },
            spacing: { after: 50 },
          })
        )
        
        if (project.impact) {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `• Impact: ${project.impact}`,
                  size: 22,
                }),
              ],
              indent: { left: convertInchesToTwip(0.25) },
              spacing: { after: 100 },
            })
          )
        }
      }
    }
    
    // Education Section
    if (resume.education.length > 0) {
      children.push(createSectionHeading("EDUCATION"))
      
      for (const edu of resume.education) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: edu.degree,
                bold: true,
                size: 22,
              }),
              new TextRun({
                text: ` | ${edu.school}`,
                size: 22,
              }),
              new TextRun({
                text: edu.graduationYear ? ` | ${edu.graduationYear}` : "",
                size: 22,
              }),
            ],
            spacing: { after: 100 },
          })
        )
      }
    }
    
    // Certifications Section
    if (resume.certifications && resume.certifications.length > 0) {
      children.push(createSectionHeading("CERTIFICATIONS"))
      
      for (const cert of resume.certifications) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `• ${cert.name}`,
                size: 22,
              }),
              new TextRun({
                text: ` - ${cert.issuer}`,
                size: 20,
              }),
              new TextRun({
                text: cert.dateObtained ? ` (${cert.dateObtained})` : "",
                size: 20,
              }),
            ],
            spacing: { after: 50 },
          })
        )
      }
    }
    
    // Create document
    const doc = new Document({
      sections: [{
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(0.75),
              right: convertInchesToTwip(0.75),
              bottom: convertInchesToTwip(0.75),
              left: convertInchesToTwip(0.75),
            },
          },
        },
        children,
      }],
    })
    
    const buffer = await Packer.toBuffer(doc)
    
    return {
      success: true,
      format: "docx",
      filename: `${resume.basics.name.replace(/\s+/g, "_")}_Resume.docx`,
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      data: buffer,
    }
  } catch (error) {
    return {
      success: false,
      format: "docx",
      filename: "",
      mimeType: "",
      data: Buffer.from(""),
      error: error instanceof Error ? error.message : "Failed to generate DOCX",
    }
  }
}

// ============================================================================
// DOCX EXPORT - COVER LETTER
// ============================================================================

export async function exportCoverLetterToDocx(
  letter: StructuredCoverLetter, 
  senderName: string,
  senderPhone?: string,
  senderEmail?: string
): Promise<ExportResult> {
  try {
    const children: Paragraph[] = []
    
    // Date
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: new Date().toLocaleDateString("en-US", { 
              year: "numeric", 
              month: "long", 
              day: "numeric" 
            }),
            size: 22,
          }),
        ],
        spacing: { after: 300 },
      })
    )
    
    // Recipient
    if (letter.recipient.name) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: letter.recipient.name, size: 22 }),
          ],
        })
      )
    }
    if (letter.recipient.title) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: letter.recipient.title, size: 22 }),
          ],
        })
      )
    }
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: letter.recipient.company, size: 22 }),
        ],
        spacing: { after: 300 },
      })
    )
    
    // Greeting
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: letter.opening.greeting, size: 22 }),
        ],
        spacing: { after: 200 },
      })
    )
    
    // Opening paragraph
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: letter.opening.hookParagraph, size: 22 }),
        ],
        spacing: { after: 200 },
      })
    )
    
    // Body sections
    for (const section of letter.bodySections) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: section.paragraphText, size: 22 }),
          ],
          spacing: { after: 200 },
        })
      )
    }
    
    // Closing
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: letter.closing.callToAction, size: 22 }),
        ],
        spacing: { after: 300 },
      })
    )
    
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: letter.closing.signoff, size: 22 }),
        ],
        spacing: { after: 100 },
      })
    )
    
    // Sender name
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: senderName || letter.closing.senderName, size: 22 }),
        ],
      })
    )
    
    // Direct phone number (if available)
    if (senderPhone) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `Direct: ${senderPhone}`, size: 20 }),
          ],
        })
      )
    }
    
    // Email (if available)
    if (senderEmail) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: senderEmail, size: 20, color: "0000EE" }),
          ],
        })
      )
    }
    
    const doc = new Document({
      sections: [{
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              right: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1),
            },
          },
        },
        children,
      }],
    })
    
    const buffer = await Packer.toBuffer(doc)
    
    return {
      success: true,
      format: "docx",
      filename: `${senderName.replace(/\s+/g, "_")}_Cover_Letter_${letter.recipient.company.replace(/\s+/g, "_")}.docx`,
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      data: buffer,
    }
  } catch (error) {
    return {
      success: false,
      format: "docx",
      filename: "",
      mimeType: "",
      data: Buffer.from(""),
      error: error instanceof Error ? error.message : "Failed to generate DOCX",
    }
  }
}

// ============================================================================
// HTML EXPORT (for PDF conversion)
// ============================================================================

export type ViewMode = "ats" | "premium"

export function exportResumeToHtml(resume: StructuredResume, viewMode: ViewMode = "ats"): string {
  if (viewMode === "premium") {
    return exportResumeToPremiumHtml(resume)
  }
  const skillsHtml = resume.skills.map(group => 
    `<p><strong>${group.category}:</strong> ${group.skills.join(", ")}</p>`
  ).join("")
  
  const experienceHtml = resume.experience.map(exp => `
    <div class="experience-entry">
      <div class="exp-header">
        <strong>${exp.title}</strong> | ${exp.company}${exp.location ? ` | ${exp.location}` : ""}
      </div>
      ${exp.startDate ? `<div class="exp-dates">${exp.startDate} - ${exp.isCurrent ? "Present" : exp.endDate || ""}</div>` : ""}
      <ul>
        ${exp.bullets.map(b => `<li>${b.text}</li>`).join("")}
      </ul>
    </div>
  `).join("")
  
  const educationHtml = resume.education.map(edu => 
    `<p><strong>${edu.degree}</strong> | ${edu.school}${edu.graduationYear ? ` | ${edu.graduationYear}` : ""}</p>`
  ).join("")
  
  const projectsHtml = resume.projects?.map(p => `
    <div class="project-entry">
      <strong>${p.title}</strong> | ${p.techStack.join(", ")}
      <ul>
        <li>${p.description}</li>
        ${p.impact ? `<li>Impact: ${p.impact}</li>` : ""}
      </ul>
    </div>
  `).join("") || ""
  
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: 'Calibri', 'Arial', sans-serif;
      font-size: 11pt;
      line-height: 1.4;
      max-width: 8.5in;
      margin: 0 auto;
      padding: 0.75in;
    }
    h1 {
      text-align: center;
      font-size: 14pt;
      margin-bottom: 5px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .contact {
      text-align: center;
      font-size: 10pt;
      margin-bottom: 15px;
    }
    h2 {
      font-size: 11pt;
      text-transform: uppercase;
      border-bottom: 1px solid #000;
      padding-bottom: 3px;
      margin-top: 15px;
      margin-bottom: 10px;
    }
    .experience-entry {
      margin-bottom: 12px;
    }
    .exp-header {
      margin-bottom: 3px;
    }
    .exp-dates {
      font-style: italic;
      font-size: 10pt;
      margin-bottom: 5px;
    }
    ul {
      margin: 5px 0;
      padding-left: 20px;
    }
    li {
      margin-bottom: 3px;
    }
    .project-entry {
      margin-bottom: 10px;
    }
  </style>
</head>
<body>
  <h1>${resume.basics.name}</h1>
  <div class="contact">
    ${[resume.basics.location, resume.basics.email, resume.basics.phone].filter(Boolean).join(" | ")}
  </div>
  
  ${resume.summary ? `
  <h2>Professional Summary</h2>
  <p>${resume.summary}</p>
  ` : ""}
  
  ${resume.skills.length > 0 ? `
  <h2>Technical Skills</h2>
  ${skillsHtml}
  ` : ""}
  
  ${resume.experience.length > 0 ? `
  <h2>Professional Experience</h2>
  ${experienceHtml}
  ` : ""}
  
  ${resume.projects && resume.projects.length > 0 ? `
  <h2>Projects</h2>
  ${projectsHtml}
  ` : ""}
  
  ${resume.education.length > 0 ? `
  <h2>Education</h2>
  ${educationHtml}
  ` : ""}
</body>
</html>`
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function createSectionHeading(text: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text: text,
        bold: true,
        size: 22, // 11pt
        allCaps: true,
      }),
    ],
    border: {
      bottom: {
        color: "000000",
        space: 1,
        style: BorderStyle.SINGLE,
        size: 6,
      },
    },
    spacing: { before: 200, after: 100 },
  })
}

// ============================================================================
// PREMIUM HTML TEMPLATES
// ============================================================================

function exportResumeToPremiumHtml(resume: StructuredResume): string {
  const skillsHtml = resume.skills.map(group =>
    `<div class="skill-group">
      <span class="skill-category">${group.category}:</span>
      <span class="skill-list">${group.skills.join(" • ")}</span>
    </div>`
  ).join("")

  const experienceHtml = resume.experience.map(exp => `
    <div class="experience-entry">
      <div class="exp-header-row">
        <div class="exp-title-company">
          <span class="exp-title">${exp.title}</span>
          <span class="exp-company">${exp.company}</span>
        </div>
        <div class="exp-meta">
          ${exp.location ? `<span class="exp-location">${exp.location}</span>` : ""}
          ${exp.startDate ? `<span class="exp-dates">${exp.startDate} – ${exp.isCurrent ? "Present" : exp.endDate || ""}</span>` : ""}
        </div>
      </div>
      <ul class="exp-bullets">
        ${exp.bullets.map(b => `<li>${b.text}</li>`).join("")}
      </ul>
    </div>
  `).join("")

  const educationHtml = resume.education.map(edu => `
    <div class="education-entry">
      <span class="edu-degree">${edu.degree}</span>
      <span class="edu-school">${edu.school}</span>
      ${edu.graduationYear ? `<span class="edu-year">${edu.graduationYear}</span>` : ""}
    </div>
  `).join("")

  const projectsHtml = resume.projects?.map(p => `
    <div class="project-entry">
      <div class="project-header">
        <span class="project-title">${p.title}</span>
        <span class="project-tech">${p.techStack.join(" • ")}</span>
      </div>
      <p class="project-desc">${p.description}</p>
      ${p.impact ? `<p class="project-impact">${p.impact}</p>` : ""}
    </div>
  `).join("") || ""

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${resume.basics.name} - Resume</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Source+Serif+4:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary: #1a1a2e;
      --secondary: #4a5568;
      --accent: #2563eb;
      --border: #e2e8f0;
      --bg: #ffffff;
      --muted: #64748b;
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 10.5pt;
      line-height: 1.5;
      color: var(--primary);
      background: var(--bg);
      max-width: 8.5in;
      margin: 0 auto;
      padding: 0.6in 0.7in;
    }
    
    /* Header */
    .header {
      text-align: center;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 2px solid var(--primary);
    }
    
    .name {
      font-family: 'Source Serif 4', Georgia, serif;
      font-size: 26pt;
      font-weight: 600;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
      color: var(--primary);
    }
    
    .contact-row {
      display: flex;
      justify-content: center;
      gap: 16px;
      flex-wrap: wrap;
      font-size: 9.5pt;
      color: var(--secondary);
    }
    
    .contact-row a {
      color: var(--accent);
      text-decoration: none;
    }
    
    .contact-row a:hover {
      text-decoration: underline;
    }
    
    .divider {
      color: var(--border);
    }
    
    /* Section Headers */
    .section {
      margin-bottom: 20px;
    }
    
    .section-title {
      font-family: 'Source Serif 4', Georgia, serif;
      font-size: 11pt;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: var(--primary);
      border-bottom: 1px solid var(--border);
      padding-bottom: 4px;
      margin-bottom: 12px;
    }
    
    /* Summary */
    .summary {
      font-size: 10pt;
      line-height: 1.6;
      color: var(--secondary);
      text-align: justify;
    }
    
    /* Skills */
    .skills-grid {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    
    .skill-group {
      display: flex;
      gap: 8px;
    }
    
    .skill-category {
      font-weight: 600;
      color: var(--primary);
      min-width: 120px;
    }
    
    .skill-list {
      color: var(--secondary);
    }
    
    /* Experience */
    .experience-entry {
      margin-bottom: 16px;
    }
    
    .experience-entry:last-child {
      margin-bottom: 0;
    }
    
    .exp-header-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 6px;
      flex-wrap: wrap;
      gap: 8px;
    }
    
    .exp-title-company {
      display: flex;
      align-items: baseline;
      gap: 8px;
    }
    
    .exp-title {
      font-weight: 600;
      color: var(--primary);
    }
    
    .exp-company {
      color: var(--secondary);
    }
    
    .exp-meta {
      display: flex;
      gap: 12px;
      font-size: 9.5pt;
      color: var(--muted);
    }
    
    .exp-bullets {
      padding-left: 18px;
      margin: 0;
    }
    
    .exp-bullets li {
      margin-bottom: 4px;
      color: var(--secondary);
    }
    
    .exp-bullets li::marker {
      color: var(--accent);
    }
    
    /* Education */
    .education-entry {
      display: flex;
      align-items: baseline;
      gap: 8px;
      margin-bottom: 6px;
    }
    
    .edu-degree {
      font-weight: 600;
    }
    
    .edu-school {
      color: var(--secondary);
    }
    
    .edu-year {
      color: var(--muted);
      font-size: 9.5pt;
      margin-left: auto;
    }
    
    /* Projects */
    .project-entry {
      margin-bottom: 12px;
    }
    
    .project-header {
      display: flex;
      align-items: baseline;
      gap: 12px;
      margin-bottom: 4px;
    }
    
    .project-title {
      font-weight: 600;
    }
    
    .project-tech {
      font-size: 9pt;
      color: var(--muted);
    }
    
    .project-desc,
    .project-impact {
      color: var(--secondary);
      margin-bottom: 4px;
    }
    
    /* Print styles */
    @media print {
      body {
        padding: 0;
      }
      
      .header {
        page-break-after: avoid;
      }
      
      .experience-entry {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <header class="header">
    <h1 class="name">${resume.basics.name}</h1>
    <div class="contact-row">
      ${resume.basics.email ? `<span>${resume.basics.email}</span>` : ""}
      ${resume.basics.phone ? `<span class="divider">|</span><span>${resume.basics.phone}</span>` : ""}
      ${resume.basics.location ? `<span class="divider">|</span><span>${resume.basics.location}</span>` : ""}
      ${resume.basics.linkedinUrl ? `<span class="divider">|</span><a href="${resume.basics.linkedinUrl}">LinkedIn</a>` : ""}
      ${resume.basics.portfolioUrl ? `<span class="divider">|</span><a href="${resume.basics.portfolioUrl}">Portfolio</a>` : ""}
    </div>
  </header>

  ${resume.summary ? `
  <section class="section">
    <h2 class="section-title">Professional Summary</h2>
    <p class="summary">${resume.summary}</p>
  </section>
  ` : ""}

  ${resume.skills.length > 0 ? `
  <section class="section">
    <h2 class="section-title">Technical Skills</h2>
    <div class="skills-grid">
      ${skillsHtml}
    </div>
  </section>
  ` : ""}

  ${resume.experience.length > 0 ? `
  <section class="section">
    <h2 class="section-title">Professional Experience</h2>
    ${experienceHtml}
  </section>
  ` : ""}

  ${resume.projects && resume.projects.length > 0 ? `
  <section class="section">
    <h2 class="section-title">Projects</h2>
    ${projectsHtml}
  </section>
  ` : ""}

  ${resume.education.length > 0 ? `
  <section class="section">
    <h2 class="section-title">Education</h2>
    ${educationHtml}
  </section>
  ` : ""}
</body>
</html>`
}

export function exportCoverLetterToHtml(
  letter: StructuredCoverLetter, 
  senderName: string, 
  viewMode: ViewMode = "ats",
  senderPhone?: string,
  senderEmail?: string
): string {
  if (viewMode === "premium") {
    return exportCoverLetterToPremiumHtml(letter, senderName, senderPhone, senderEmail)
  }
  
  // ATS-safe version (existing code)
  const bodySectionsHtml = letter.bodySections
    .map(s => `<p>${s.paragraphText}</p>`)
    .join("")

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: 'Calibri', 'Arial', sans-serif;
      font-size: 11pt;
      line-height: 1.5;
      max-width: 8.5in;
      margin: 0 auto;
      padding: 1in;
    }
    .date {
      margin-bottom: 20px;
    }
    .recipient {
      margin-bottom: 20px;
    }
    p {
      margin-bottom: 15px;
    }
    .signoff {
      margin-top: 30px;
    }
  </style>
</head>
<body>
  <div class="date">
    ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
  </div>

  <div class="recipient">
    ${letter.recipient.name ? `<div>${letter.recipient.name}</div>` : ""}
    ${letter.recipient.title ? `<div>${letter.recipient.title}</div>` : ""}
    <div>${letter.recipient.company}</div>
  </div>

  <p>${letter.opening.greeting}</p>

  <p>${letter.opening.hookParagraph}</p>

  ${bodySectionsHtml}

  <p>${letter.closing.callToAction}</p>

  <div class="signoff">
    <p>${letter.closing.signoff}</p>
    <p><strong>${senderName || letter.closing.senderName}</strong></p>
    ${senderPhone ? `<p>Direct: <a href="tel:${senderPhone.replace(/[^0-9+]/g, '')}">${senderPhone}</a></p>` : ""}
    ${senderEmail ? `<p><a href="mailto:${senderEmail}">${senderEmail}</a></p>` : ""}
  </div>
</body>
</html>`
}

function exportCoverLetterToPremiumHtml(
  letter: StructuredCoverLetter, 
  senderName: string,
  senderPhone?: string,
  senderEmail?: string
): string {
  const bodySectionsHtml = letter.bodySections
    .map(s => `<p>${s.paragraphText}</p>`)
    .join("")

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cover Letter - ${letter.recipient.company}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Source+Serif+4:wght@400;500&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary: #1a1a2e;
      --secondary: #4a5568;
      --accent: #2563eb;
      --border: #e2e8f0;
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Source Serif 4', Georgia, serif;
      font-size: 11pt;
      line-height: 1.7;
      color: var(--primary);
      max-width: 8.5in;
      margin: 0 auto;
      padding: 1in;
    }
    
    .header {
      margin-bottom: 32px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--border);
    }
    
    .sender-name {
      font-family: 'Inter', sans-serif;
      font-size: 18pt;
      font-weight: 600;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }
    
    .date {
      font-family: 'Inter', sans-serif;
      font-size: 10pt;
      color: var(--secondary);
    }
    
    .recipient {
      margin-bottom: 28px;
      font-family: 'Inter', sans-serif;
      font-size: 10pt;
      color: var(--secondary);
      line-height: 1.5;
    }
    
    .greeting {
      margin-bottom: 20px;
      font-weight: 500;
    }
    
    .body p {
      margin-bottom: 16px;
      text-align: justify;
    }
    
    .body p:first-child::first-letter {
      font-size: 1.5em;
      font-weight: 500;
    }
    
    .closing {
      margin-top: 32px;
    }
    
    .signoff {
      margin-bottom: 24px;
    }
    
    .signature {
      font-family: 'Inter', sans-serif;
      font-weight: 600;
      font-size: 12pt;
    }
    
    @media print {
      body {
        padding: 0;
      }
    }
  </style>
</head>
<body>
  <header class="header">
    <div class="sender-name">${senderName || letter.closing.senderName}</div>
    <div class="date">${new Date().toLocaleDateString("en-US", { 
      weekday: "long",
      year: "numeric", 
      month: "long", 
      day: "numeric" 
    })}</div>
  </header>

  <div class="recipient">
    ${letter.recipient.name ? `<div>${letter.recipient.name}</div>` : ""}
    ${letter.recipient.title ? `<div>${letter.recipient.title}</div>` : ""}
    <div>${letter.recipient.company}</div>
  </div>

  <p class="greeting">${letter.opening.greeting}</p>

  <div class="body">
    <p>${letter.opening.hookParagraph}</p>
    ${bodySectionsHtml}
    <p>${letter.closing.callToAction}</p>
  </div>

  <div class="closing">
    <p class="signoff">${letter.closing.signoff}</p>
    <p class="signature">${senderName || letter.closing.senderName}</p>
    ${senderPhone ? `<p style="font-family: 'Inter', sans-serif; font-size: 10pt; color: var(--secondary); margin-top: 4px;">Direct: <a href="tel:${senderPhone.replace(/[^0-9+]/g, '')}" style="color: var(--accent); text-decoration: none;">${senderPhone}</a></p>` : ""}
    ${senderEmail ? `<p style="font-family: 'Inter', sans-serif; font-size: 10pt; color: var(--secondary);"><a href="mailto:${senderEmail}" style="color: var(--accent); text-decoration: none;">${senderEmail}</a></p>` : ""}
  </div>
</body>
</html>`
}

// ============================================================================
// FILE NAMING (deprecated - use @/lib/filename-utils instead)
// ============================================================================

// Re-export from filename-utils for backwards compatibility
export { generateDocumentFilename as generateFilename } from "./filename-utils"
