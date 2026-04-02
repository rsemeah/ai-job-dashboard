"use client";

import React, { useRef } from "react";
import { ResumeProps } from "../types/ResumeProps";
import { ResumeBase } from "./ResumeBase";
import { TEMPLATE_CONFIGS, ALL_TEMPLATE_IDS } from "../config/resumeTemplates.config";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ResumeRendererProps {
  resumeData: ResumeProps;
  showTemplateSelector?: boolean;
  onTemplateChange?: (templateId: ResumeProps["templateId"]) => void;
  onExportPDF?: () => void;
  printMode?: boolean;
}

// ─── PDF Export utility ───────────────────────────────────────────────────────
// Uses browser print dialog scoped to resume element.
// For production: swap with html2canvas + jsPDF or react-to-pdf.

async function exportToPDF(elementId: string, fileName: string) {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`[ResumeRenderer] Element #${elementId} not found for PDF export`);
    return;
  }

  // Production path: use html2canvas + jsPDF
  // Install: npm install html2canvas jspdf
  // Uncomment below when dependencies are available:
  //
  // const html2canvas = (await import("html2canvas")).default;
  // const jsPDF = (await import("jspdf")).default;
  // const canvas = await html2canvas(element, { scale: 2, useCORS: true });
  // const imgData = canvas.toDataURL("image/png");
  // const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  // const pdfWidth = pdf.internal.pageSize.getWidth();
  // const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
  // pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
  // pdf.save(fileName);

  // Fallback: browser print
  const originalTitle = document.title;
  document.title = fileName;
  window.print();
  document.title = originalTitle;
}

// ─── Template selector ────────────────────────────────────────────────────────

function TemplateSelector({
  currentId,
  onChange,
}: {
  currentId: ResumeProps["templateId"];
  onChange: (id: ResumeProps["templateId"]) => void;
}) {
  const byIndustry: Record<string, typeof ALL_TEMPLATE_IDS> = {};
  ALL_TEMPLATE_IDS.forEach((id) => {
    const industry = TEMPLATE_CONFIGS[id].industry;
    if (!byIndustry[industry]) byIndustry[industry] = [];
    byIndustry[industry].push(id);
  });

  return (
    <div style={{
      fontFamily: "'DM Sans', sans-serif",
      fontSize: "12px",
      marginBottom: "20px",
      padding: "12px 16px",
      backgroundColor: "#f5f4f0",
      borderRadius: "6px",
      border: "1px solid #e0ddd6",
    }}>
      <div style={{ fontWeight: 700, marginBottom: "8px", fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "#555" }}>
        Template — {TEMPLATE_CONFIGS[currentId].label}
      </div>
      <select
        value={currentId}
        onChange={(e) => onChange(e.target.value as ResumeProps["templateId"])}
        style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: "12px",
          padding: "6px 10px",
          border: "1px solid #ccc",
          borderRadius: "4px",
          backgroundColor: "#fff",
          width: "100%",
          cursor: "pointer",
        }}
      >
        {Object.entries(byIndustry).map(([industry, ids]) => (
          <optgroup key={industry} label={industry}>
            {ids.map((id) => (
              <option key={id} value={id}>
                {TEMPLATE_CONFIGS[id].label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  );
}

// ─── Export button ────────────────────────────────────────────────────────────

function ExportButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        fontFamily: "'Barlow Condensed', sans-serif",
        fontSize: "13px",
        fontWeight: 700,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        backgroundColor: "#d90009",
        color: "#fff",
        border: "none",
        borderRadius: "4px",
        padding: "8px 20px",
        cursor: "pointer",
        marginBottom: "20px",
        marginLeft: "8px",
      }}
    >
      Export PDF
    </button>
  );
}

// ─── Main renderer ────────────────────────────────────────────────────────────

export function ResumeRenderer({
  resumeData,
  showTemplateSelector = false,
  onTemplateChange,
  onExportPDF,
  printMode = false,
}: ResumeRendererProps) {
  const handleExport = async () => {
    const fileName = `${resumeData.name.replace(/\s+/g, "_")}_Resume.pdf`;
    await exportToPDF(`resume-${resumeData.templateId}`, fileName);
    onExportPDF?.();
  };

  if (printMode) {
    return <ResumeBase {...resumeData} />;
  }

  return (
    <div>
      {/* Controls — hidden in print */}
      <div className="no-print" style={{ display: "flex", alignItems: "center", flexWrap: "wrap" }}>
        {showTemplateSelector && onTemplateChange && (
          <div style={{ flex: 1, minWidth: "240px" }}>
            <TemplateSelector currentId={resumeData.templateId} onChange={onTemplateChange} />
          </div>
        )}
        <ExportButton onClick={handleExport} />
      </div>

      {/* Resume output */}
      <div style={{
        boxShadow: "0 2px 20px rgba(0,0,0,0.12)",
        borderRadius: "4px",
        overflow: "hidden",
      }}>
        <ResumeBase {...resumeData} />
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; padding: 0; background: white; }
          #resume-${resumeData.templateId} {
            box-shadow: none !important;
            border-radius: 0 !important;
            max-width: 100% !important;
            margin: 0 !important;
          }
        }
        @page {
          size: letter portrait;
          margin: 0.5in;
        }
      `}</style>
    </div>
  );
}

export default ResumeRenderer;
