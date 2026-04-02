"use client";

import React from "react";
import { ResumeProps, ResumeExperienceItem, ResumeEducationItem, ResumeCertification, ResumeSkillGroup, ResumeProject, ResumePublication } from "../types/ResumeProps";
import { getTemplateConfig, TemplateConfig, LayoutVariant } from "../config/resumeTemplates.config";

// ─── Style helpers ───────────────────────────────────────────────────────────

const FONT = {
  heading: "'Barlow Condensed', sans-serif",
  body: "'DM Sans', sans-serif",
  mono: "'JetBrains Mono', monospace",
};

function buildStyles(config: TemplateConfig, accentOverride?: string) {
  const accent = accentOverride || config.accentColor;
  const scale = config.typographyScale;

  return {
    // Page wrapper
    page: {
      fontFamily: FONT.body,
      fontSize: scale === "compact" ? "11px" : scale === "generous" ? "13px" : "12px",
      lineHeight: scale === "compact" ? "1.4" : "1.6",
      color: "#1a1a1a",
      backgroundColor: "#faf9f6",
      maxWidth: "816px",
      margin: "0 auto",
      padding: scale === "compact" ? "32px 40px" : scale === "generous" ? "48px 56px" : "40px 48px",
    } as React.CSSProperties,

    // Header
    headerWrap: {
      borderBottom: config.ruleDividers ? `2.5px solid ${accent}` : "none",
      paddingBottom: "16px",
      marginBottom: "20px",
      textAlign: config.headerStyle === "centered" ? "center" : "left",
    } as React.CSSProperties,

    name: {
      fontFamily: FONT.heading,
      fontSize: scale === "generous" ? "36px" : "30px",
      fontWeight: 700,
      letterSpacing: "0.04em",
      textTransform: "uppercase" as const,
      color: "#0d0d0d",
      margin: 0,
      lineHeight: 1.1,
    } as React.CSSProperties,

    headline: {
      fontFamily: FONT.heading,
      fontSize: "15px",
      fontWeight: 500,
      color: accent,
      letterSpacing: "0.06em",
      textTransform: "uppercase" as const,
      marginTop: "4px",
      marginBottom: "8px",
    } as React.CSSProperties,

    contactRow: {
      fontFamily: FONT.body,
      fontSize: "11px",
      color: "#555",
      display: "flex",
      flexWrap: "wrap" as const,
      gap: "12px",
      justifyContent: config.headerStyle === "centered" ? "center" : "flex-start",
      marginTop: "6px",
    } as React.CSSProperties,

    contactItem: {
      display: "flex",
      alignItems: "center",
      gap: "4px",
    } as React.CSSProperties,

    // Section
    section: {
      marginBottom: scale === "compact" ? "14px" : "20px",
    } as React.CSSProperties,

    sectionTitle: {
      fontFamily: FONT.heading,
      fontSize: "13px",
      fontWeight: 700,
      letterSpacing: "0.1em",
      textTransform: "uppercase" as const,
      color: accent,
      borderBottom: config.ruleDividers ? `1px solid ${accent}` : "none",
      paddingBottom: config.ruleDividers ? "3px" : "0",
      marginBottom: "10px",
    } as React.CSSProperties,

    // Experience item
    expHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: "2px",
    } as React.CSSProperties,

    expTitle: {
      fontFamily: FONT.heading,
      fontSize: "14px",
      fontWeight: 700,
      letterSpacing: "0.02em",
      color: "#0d0d0d",
    } as React.CSSProperties,

    expCompany: {
      fontFamily: FONT.body,
      fontSize: "12px",
      fontWeight: 600,
      color: "#333",
    } as React.CSSProperties,

    expDate: {
      fontFamily: FONT.mono,
      fontSize: "10px",
      color: "#666",
      whiteSpace: "nowrap" as const,
      marginLeft: "12px",
      paddingTop: "2px",
    } as React.CSSProperties,

    bullet: {
      margin: "2px 0",
      paddingLeft: "14px",
      position: "relative" as const,
      color: "#2a2a2a",
      fontSize: "inherit",
    } as React.CSSProperties,

    bulletDot: {
      position: "absolute" as const,
      left: "2px",
      color: accent,
      fontWeight: 700,
    } as React.CSSProperties,

    // Skills
    skillGroup: {
      marginBottom: "8px",
    } as React.CSSProperties,

    skillCategory: {
      fontFamily: FONT.heading,
      fontSize: "11px",
      fontWeight: 700,
      letterSpacing: "0.06em",
      textTransform: "uppercase" as const,
      color: "#444",
      marginBottom: "4px",
    } as React.CSSProperties,

    skillBadge: {
      display: "inline-block",
      backgroundColor: `${accent}12`,
      border: `1px solid ${accent}30`,
      borderRadius: "3px",
      padding: "1px 7px",
      fontSize: "11px",
      color: "#333",
      marginRight: "5px",
      marginBottom: "4px",
      fontFamily: FONT.body,
    } as React.CSSProperties,

    skillPlain: {
      color: "#333",
      fontSize: "11px",
    } as React.CSSProperties,

    // Education
    eduTitle: {
      fontFamily: FONT.heading,
      fontSize: "13px",
      fontWeight: 700,
      color: "#0d0d0d",
    } as React.CSSProperties,

    eduInstitution: {
      fontFamily: FONT.body,
      fontSize: "12px",
      color: "#444",
    } as React.CSSProperties,

    // Certifications
    certName: {
      fontFamily: FONT.body,
      fontSize: "12px",
      fontWeight: 600,
      color: "#222",
    } as React.CSSProperties,

    certMeta: {
      fontFamily: FONT.mono,
      fontSize: "10px",
      color: "#666",
    } as React.CSSProperties,

    // Summary
    summary: {
      color: "#2a2a2a",
      fontSize: "12px",
      lineHeight: "1.7",
    } as React.CSSProperties,

    // Score badge (gated)
    scoreBadge: {
      display: "inline-flex",
      alignItems: "center",
      gap: "6px",
      backgroundColor: accent,
      color: "#fff",
      fontFamily: FONT.mono,
      fontSize: "10px",
      padding: "2px 8px",
      borderRadius: "2px",
      marginLeft: "8px",
    } as React.CSSProperties,

    // Print safety
    printSafe: {
      WebkitPrintColorAdjust: "exact" as any,
      printColorAdjust: "exact" as any,
    } as React.CSSProperties,
  };
}

// ─── Section components ───────────────────────────────────────────────────────

function SectionTitle({ label, styles }: { label: string; styles: ReturnType<typeof buildStyles> }) {
  return <div style={styles.sectionTitle}>{label}</div>;
}

function ContactRow({ contact, headerStyle, styles }: { contact: ResumeProps["contact"]; headerStyle: string; styles: ReturnType<typeof buildStyles> }) {
  if (!contact) return null;
  const items = [
    contact.email,
    contact.phone,
    contact.location,
    contact.linkedin && `linkedin.com/in/${contact.linkedin}`,
    contact.github && `github.com/${contact.github}`,
    contact.portfolio || contact.website,
  ].filter(Boolean);

  return (
    <div style={styles.contactRow}>
      {items.map((item, i) => (
        <span key={i} style={styles.contactItem}>
          {i > 0 && <span style={{ color: "#bbb", marginRight: "0px" }}>·</span>}
          {item}
        </span>
      ))}
    </div>
  );
}

function SummarySection({ summary, styles }: { summary?: string; styles: ReturnType<typeof buildStyles> }) {
  if (!summary) return null;
  return (
    <div style={styles.section}>
      <SectionTitle label="Professional Summary" styles={styles} />
      <p style={styles.summary}>{summary}</p>
    </div>
  );
}

function ExperienceSection({ experience, styles }: { experience?: ResumeExperienceItem[]; styles: ReturnType<typeof buildStyles> }) {
  if (!experience?.length) return null;
  return (
    <div style={styles.section}>
      <SectionTitle label="Experience" styles={styles} />
      {experience.map((job, i) => (
        <div key={i} style={{ marginBottom: "14px" }}>
          <div style={styles.expHeader}>
            <div>
              <div style={styles.expTitle}>{job.title}</div>
              <div style={styles.expCompany}>
                {job.company}
                {job.location && <span style={{ color: "#888", fontWeight: 400 }}> · {job.location}</span>}
              </div>
            </div>
            <div style={styles.expDate}>
              {job.startDate} – {job.endDate ?? "Present"}
            </div>
          </div>
          <ul style={{ margin: "6px 0 0", padding: 0, listStyle: "none" }}>
            {job.bullets.map((b, j) => (
              <li key={j} style={styles.bullet}>
                <span style={styles.bulletDot}>›</span>
                {b}
              </li>
            ))}
          </ul>
          {job.keywords?.length ? (
            <div style={{ marginTop: "4px", fontSize: "10px", color: "#888", fontFamily: FONT.mono }}>
              {job.keywords.join(" · ")}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function SkillsSection({ skills, showBadges, styles }: { skills?: ResumeSkillGroup[]; showBadges: boolean; styles: ReturnType<typeof buildStyles> }) {
  if (!skills?.length) return null;
  return (
    <div style={styles.section}>
      <SectionTitle label="Skills" styles={styles} />
      {skills.map((group, i) => (
        <div key={i} style={styles.skillGroup}>
          <div style={styles.skillCategory}>{group.category}</div>
          <div>
            {showBadges
              ? group.skills.map((s, j) => (
                  <span key={j} style={styles.skillBadge}>{s}</span>
                ))
              : <span style={styles.skillPlain}>{group.skills.join(" · ")}</span>
            }
          </div>
        </div>
      ))}
    </div>
  );
}

function EducationSection({ education, styles }: { education?: ResumeEducationItem[]; styles: ReturnType<typeof buildStyles> }) {
  if (!education?.length) return null;
  return (
    <div style={styles.section}>
      <SectionTitle label="Education" styles={styles} />
      {education.map((edu, i) => (
        <div key={i} style={{ marginBottom: "10px" }}>
          <div style={styles.expHeader}>
            <div>
              <div style={styles.eduTitle}>{edu.degree}{edu.field ? `, ${edu.field}` : ""}</div>
              <div style={styles.eduInstitution}>{edu.institution}</div>
              {edu.gpa && <div style={styles.certMeta}>GPA: {edu.gpa}</div>}
              {edu.honors?.length && <div style={styles.certMeta}>{edu.honors.join(" · ")}</div>}
            </div>
            {edu.graduationDate && <div style={styles.expDate}>{edu.graduationDate}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

function CertificationsSection({ certifications, styles }: { certifications?: ResumeCertification[]; styles: ReturnType<typeof buildStyles> }) {
  if (!certifications?.length) return null;
  return (
    <div style={styles.section}>
      <SectionTitle label="Certifications & Licenses" styles={styles} />
      {certifications.map((cert, i) => (
        <div key={i} style={{ marginBottom: "6px" }}>
          <span style={styles.certName}>{cert.name}</span>
          {cert.issuer && <span style={{ ...styles.certMeta, marginLeft: "8px" }}>{cert.issuer}</span>}
          {cert.date && <span style={{ ...styles.certMeta, marginLeft: "8px" }}>{cert.date}</span>}
        </div>
      ))}
    </div>
  );
}

function ProjectsSection({ projects, styles }: { projects?: ResumeProject[]; styles: ReturnType<typeof buildStyles> }) {
  if (!projects?.length) return null;
  return (
    <div style={styles.section}>
      <SectionTitle label="Projects" styles={styles} />
      {projects.map((p, i) => (
        <div key={i} style={{ marginBottom: "10px" }}>
          <div style={styles.expTitle}>
            {p.name}
            {p.url && <span style={{ fontFamily: FONT.mono, fontSize: "10px", color: "#888", marginLeft: "8px" }}>{p.url}</span>}
          </div>
          {p.description && <div style={styles.summary}>{p.description}</div>}
          {p.highlights?.map((h, j) => (
            <div key={j} style={styles.bullet}><span style={styles.bulletDot}>›</span>{h}</div>
          ))}
        </div>
      ))}
    </div>
  );
}

function PublicationsSection({ publications, styles }: { publications?: ResumePublication[]; styles: ReturnType<typeof buildStyles> }) {
  if (!publications?.length) return null;
  return (
    <div style={styles.section}>
      <SectionTitle label="Publications" styles={styles} />
      {publications.map((pub, i) => (
        <div key={i} style={{ marginBottom: "6px" }}>
          <span style={styles.certName}>{pub.title}</span>
          {pub.publisher && <span style={{ ...styles.certMeta, marginLeft: "8px" }}>{pub.publisher}</span>}
          {pub.date && <span style={{ ...styles.certMeta, marginLeft: "8px" }}>{pub.date}</span>}
        </div>
      ))}
    </div>
  );
}

function AwardsSection({ awards, styles }: { awards?: string[]; styles: ReturnType<typeof buildStyles> }) {
  if (!awards?.length) return null;
  return (
    <div style={styles.section}>
      <SectionTitle label="Awards & Recognition" styles={styles} />
      {awards.map((a, i) => (
        <div key={i} style={styles.bullet}><span style={styles.bulletDot}>›</span>{a}</div>
      ))}
    </div>
  );
}

function LanguagesSection({ languages, styles }: { languages?: string[]; styles: ReturnType<typeof buildStyles> }) {
  if (!languages?.length) return null;
  return (
    <div style={styles.section}>
      <SectionTitle label="Languages" styles={styles} />
      <div style={styles.skillPlain}>{languages.join(" · ")}</div>
    </div>
  );
}

// ─── Section router ───────────────────────────────────────────────────────────

function renderSection(key: string, props: ResumeProps, config: TemplateConfig, styles: ReturnType<typeof buildStyles>) {
  switch (key) {
    case "summary":      return <SummarySection key={key} summary={props.summary} styles={styles} />;
    case "experience":   return <ExperienceSection key={key} experience={props.experience} styles={styles} />;
    case "skills":       return <SkillsSection key={key} skills={props.skills} showBadges={config.showSkillBadges} styles={styles} />;
    case "education":    return <EducationSection key={key} education={props.education} styles={styles} />;
    case "certifications": return <CertificationsSection key={key} certifications={props.certifications} styles={styles} />;
    case "projects":     return <ProjectsSection key={key} projects={props.projects} styles={styles} />;
    case "publications": return <PublicationsSection key={key} publications={props.publications} styles={styles} />;
    case "awards":       return <AwardsSection key={key} awards={props.awards} styles={styles} />;
    case "languages":    return <LanguagesSection key={key} languages={props.languages} styles={styles} />;
    default:             return null;
  }
}

// ─── Header variants ──────────────────────────────────────────────────────────

function ResumeHeader({ props, config, styles }: { props: ResumeProps; config: TemplateConfig; styles: ReturnType<typeof buildStyles> }) {
  const showScore = props.scoring?.showScores && props.scoring?.fitScore !== undefined;

  return (
    <div style={styles.headerWrap}>
      <h1 style={styles.name}>
        {props.name}
        {showScore && (
          <span style={styles.scoreBadge}>
            {props.scoring!.fitScore}% fit
          </span>
        )}
      </h1>
      {props.title && <div style={styles.headline}>{props.title}</div>}
      <ContactRow contact={props.contact} headerStyle={config.headerStyle} styles={styles} />
    </div>
  );
}

// ─── Layout variants ──────────────────────────────────────────────────────────

function SingleColumnLayout({ props, config, styles }: { props: ResumeProps; config: TemplateConfig; styles: ReturnType<typeof buildStyles> }) {
  return (
    <>
      <ResumeHeader props={props} config={config} styles={styles} />
      {config.sectionOrder.map((key) => renderSection(key, props, config, styles))}
    </>
  );
}

function SingleWithSidebarLayout({ props, config, styles }: { props: ResumeProps; config: TemplateConfig; styles: ReturnType<typeof buildStyles> }) {
  // Sidebar: skills, certifications, education, languages
  // Main: summary, experience, projects, awards
  const sidebarKeys = ["skills", "certifications", "education", "languages"];
  const mainKeys = config.sectionOrder.filter((k) => !sidebarKeys.includes(k));
  const sidebarOrder = config.sectionOrder.filter((k) => sidebarKeys.includes(k));

  return (
    <>
      <ResumeHeader props={props} config={config} styles={styles} />
      {/* NOTE: for ATS safety, both columns are in a single-column stacked DOM order.
          Visual sidebar is achieved via CSS float — parsers read linearized HTML. */}
      <div style={{ display: "flex", gap: "32px", alignItems: "flex-start" }}>
        <div style={{ flex: "1 1 0" }}>
          {mainKeys.map((key) => renderSection(key, props, config, styles))}
        </div>
        <div style={{ width: "200px", flexShrink: 0, borderLeft: `2px solid ${config.accentColor}20`, paddingLeft: "20px" }}>
          {sidebarOrder.map((key) => renderSection(key, props, config, styles))}
        </div>
      </div>
    </>
  );
}

function HeaderAccentLayout({ props, config, styles, accent }: { props: ResumeProps; config: TemplateConfig; styles: ReturnType<typeof buildStyles>; accent: string }) {
  return (
    <>
      <div style={{
        backgroundColor: accent,
        margin: "-40px -48px 24px",
        padding: "28px 48px 20px",
        color: "#fff",
      }}>
        <h1 style={{ ...styles.name, color: "#fff" }}>{props.name}</h1>
        {props.title && (
          <div style={{ ...styles.headline, color: "rgba(255,255,255,0.85)" }}>{props.title}</div>
        )}
        {props.contact && (
          <div style={{ ...styles.contactRow, color: "rgba(255,255,255,0.75)" }}>
            {[props.contact.email, props.contact.phone, props.contact.location,
              props.contact.linkedin && `linkedin.com/in/${props.contact.linkedin}`,
              props.contact.portfolio,
            ].filter(Boolean).map((item, i) => (
              <span key={i}>{i > 0 && <span style={{ marginRight: "8px" }}>·</span>}{item}</span>
            ))}
          </div>
        )}
      </div>
      {config.sectionOrder.map((key) => renderSection(key, props, config, styles))}
    </>
  );
}

function ExecutiveRuledLayout({ props, config, styles }: { props: ResumeProps; config: TemplateConfig; styles: ReturnType<typeof buildStyles> }) {
  return (
    <>
      <div style={{ borderTop: `4px solid ${config.accentColor}`, paddingTop: "20px", marginBottom: "16px" }}>
        <h1 style={{ ...styles.name, fontSize: "38px" }}>{props.name}</h1>
        {props.title && <div style={{ ...styles.headline, fontSize: "14px" }}>{props.title}</div>}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px" }}>
          <ContactRow contact={props.contact} headerStyle="left-aligned" styles={styles} />
        </div>
        <div style={{ height: "2px", backgroundColor: config.accentColor, marginTop: "16px" }} />
      </div>
      {config.sectionOrder.map((key) => renderSection(key, props, config, styles))}
    </>
  );
}

function EditorialLayout({ props, config, styles, accent }: { props: ResumeProps; config: TemplateConfig; styles: ReturnType<typeof buildStyles>; accent: string }) {
  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", borderBottom: `3px solid ${accent}`, paddingBottom: "16px", marginBottom: "20px" }}>
        <div>
          <h1 style={{ ...styles.name, fontSize: "32px" }}>{props.name}</h1>
          {props.title && <div style={{ ...styles.headline }}>{props.title}</div>}
        </div>
        <div style={{ textAlign: "right" }}>
          <ContactRow contact={props.contact} headerStyle="left-aligned" styles={styles} />
        </div>
      </div>
      {config.sectionOrder.map((key) => renderSection(key, props, config, styles))}
    </>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function ResumeBase(props: ResumeProps) {
  const config = getTemplateConfig(props.templateId);
  const accent = props.accentColor || config.accentColor;
  const styles = buildStyles(config, accent);

  function renderLayout() {
    switch (config.layout as LayoutVariant) {
      case "single-with-sidebar":
        return <SingleWithSidebarLayout props={props} config={config} styles={styles} />;
      case "header-accent":
        return <HeaderAccentLayout props={props} config={config} styles={styles} accent={accent} />;
      case "executive-ruled":
        return <ExecutiveRuledLayout props={props} config={config} styles={styles} />;
      case "editorial":
        return <EditorialLayout props={props} config={config} styles={styles} accent={accent} />;
      case "single-column":
      default:
        return <SingleColumnLayout props={props} config={config} styles={styles} />;
    }
  }

  return (
    <div
      id={`resume-${props.templateId}`}
      style={{ ...styles.page, ...styles.printSafe }}
      data-template-id={props.templateId}
      data-industry={props.targetIndustry}
    >
      {renderLayout()}
    </div>
  );
}

export default ResumeBase;
