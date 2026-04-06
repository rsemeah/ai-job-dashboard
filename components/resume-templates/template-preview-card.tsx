"use client"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Check, Shield, Sparkles, Briefcase } from "lucide-react"
import { 
  TEMPLATE_CONFIGS, 
  type TemplateConfig 
} from "@/lib/resume-templates/config/resumeTemplates.config"
import type { TemplateId } from "@/lib/resume-templates/types/ResumeProps"

interface TemplatePreviewCardProps {
  templateId: TemplateId
  isSelected?: boolean
  isRecommended?: boolean
  onClick?: () => void
  previewData?: {
    name?: string
    title?: string
  }
  size?: "sm" | "md" | "lg"
  showDetails?: boolean
}

// Generate short tag labels for templates
function getTemplateTags(config: TemplateConfig): string[] {
  const tags: string[] = []
  
  // ATS safety indicator
  if (config.layout === "single-column") {
    tags.push("ATS Safe")
  }
  
  // Tier indicator
  if (config.tier === "executive") {
    tags.push("Executive")
  } else if (config.tier === "director") {
    tags.push("Leadership")
  } else if (config.tier === "senior-ic") {
    tags.push("Senior")
  }
  
  // Layout indicator
  if (config.typographyScale === "compact") {
    tags.push("Compact")
  }
  
  // Special layouts
  if (config.layout === "editorial") {
    tags.push("Editorial")
  }
  
  return tags.slice(0, 2) // Max 2 tags
}

// Get abbreviated industry label
function getIndustryShort(industry: string): string {
  const map: Record<string, string> = {
    "Technology": "Tech",
    "Finance": "Finance",
    "Healthcare": "Health",
    "Creative & Marketing": "Creative",
    "Legal": "Legal",
    "Education": "Education",
    "Consulting & Strategy": "Consulting",
    "Sales & Business Development": "Sales",
    "Operations & Supply Chain": "Ops",
    "Cross-Industry": "General",
  }
  return map[industry] || industry
}

// Layout preview visual
function LayoutPreview({ 
  layout, 
  accentColor 
}: { 
  layout: TemplateConfig["layout"]
  accentColor: string 
}) {
  const baseClasses = "rounded-sm"
  const accentStyle = { backgroundColor: accentColor }
  const grayStyle = { backgroundColor: "#c0c0c0" }
  const lightGrayStyle = { backgroundColor: "#d8d8d8" }
  
  switch (layout) {
    case "single-with-sidebar":
      return (
        <div className="flex gap-1 h-full">
          <div className="flex-1 flex flex-col gap-1">
            <div className={cn(baseClasses, "h-2 w-full")} style={accentStyle} />
            <div className={cn(baseClasses, "h-1 w-3/4")} style={grayStyle} />
            <div className={cn(baseClasses, "h-1 w-full")} style={lightGrayStyle} />
            <div className={cn(baseClasses, "h-1 w-5/6")} style={lightGrayStyle} />
            <div className={cn(baseClasses, "h-1 w-full")} style={lightGrayStyle} />
          </div>
          <div className="w-1/4 flex flex-col gap-1">
            <div className={cn(baseClasses, "h-1 w-full")} style={grayStyle} />
            <div className={cn(baseClasses, "h-1 w-full")} style={lightGrayStyle} />
            <div className={cn(baseClasses, "h-1 w-3/4")} style={lightGrayStyle} />
          </div>
        </div>
      )
    
    case "header-accent":
      return (
        <div className="flex flex-col gap-1 h-full">
          <div className={cn(baseClasses, "h-4 w-full")} style={accentStyle} />
          <div className={cn(baseClasses, "h-1 w-3/4")} style={grayStyle} />
          <div className={cn(baseClasses, "h-1 w-full")} style={lightGrayStyle} />
          <div className={cn(baseClasses, "h-1 w-5/6")} style={lightGrayStyle} />
          <div className={cn(baseClasses, "h-1 w-full")} style={lightGrayStyle} />
        </div>
      )
    
    case "executive-ruled":
      return (
        <div className="flex flex-col gap-1 h-full">
          <div className={cn(baseClasses, "h-0.5 w-full")} style={accentStyle} />
          <div className={cn(baseClasses, "h-2 w-1/2")} style={grayStyle} />
          <div className={cn(baseClasses, "h-0.5 w-full")} style={accentStyle} />
          <div className={cn(baseClasses, "h-1 w-full")} style={lightGrayStyle} />
          <div className={cn(baseClasses, "h-1 w-5/6")} style={lightGrayStyle} />
          <div className={cn(baseClasses, "h-1 w-full")} style={lightGrayStyle} />
        </div>
      )
    
    case "editorial":
      return (
        <div className="flex flex-col gap-1 h-full">
          <div className="flex justify-between items-end">
            <div className={cn(baseClasses, "h-2 w-1/3")} style={grayStyle} />
            <div className={cn(baseClasses, "h-1 w-1/4")} style={lightGrayStyle} />
          </div>
          <div className={cn(baseClasses, "h-0.5 w-full")} style={accentStyle} />
          <div className={cn(baseClasses, "h-1 w-full")} style={lightGrayStyle} />
          <div className={cn(baseClasses, "h-1 w-5/6")} style={lightGrayStyle} />
          <div className={cn(baseClasses, "h-1 w-full")} style={lightGrayStyle} />
        </div>
      )
    
    case "single-column":
    default:
      return (
        <div className="flex flex-col gap-1 h-full">
          <div className={cn(baseClasses, "h-2 w-1/2")} style={grayStyle} />
          <div className={cn(baseClasses, "h-1 w-1/3")} style={{ ...grayStyle, opacity: 0.6 }} />
          <div className={cn(baseClasses, "h-0.5 w-full mt-1")} style={accentStyle} />
          <div className={cn(baseClasses, "h-1 w-full")} style={lightGrayStyle} />
          <div className={cn(baseClasses, "h-1 w-5/6")} style={lightGrayStyle} />
          <div className={cn(baseClasses, "h-1 w-full")} style={lightGrayStyle} />
        </div>
      )
  }
}

export function TemplatePreviewCard({
  templateId,
  isSelected = false,
  isRecommended = false,
  onClick,
  previewData,
  size = "md",
  showDetails = true,
}: TemplatePreviewCardProps) {
  const config = TEMPLATE_CONFIGS[templateId]
  if (!config) return null
  
  const tags = getTemplateTags(config)
  const industryShort = getIndustryShort(config.industry)
  
  const sizeClasses = {
    sm: "w-28 p-2",
    md: "w-40 p-3",
    lg: "w-52 p-4",
  }
  
  const previewHeights = {
    sm: "h-16",
    md: "h-24",
    lg: "h-32",
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex flex-col rounded-lg border bg-card text-left transition-all duration-200",
        "hover:border-primary/50 hover:shadow-md",
        "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
        sizeClasses[size],
        isSelected && "border-primary ring-2 ring-primary ring-offset-2 bg-primary/5",
        !isSelected && "border-border"
      )}
    >
      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
          <Check className="h-3 w-3 text-primary-foreground" />
        </div>
      )}
      
      {/* Recommended badge */}
      {isRecommended && !isSelected && (
        <div className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-amber-500 flex items-center justify-center">
          <Sparkles className="h-3 w-3 text-white" />
        </div>
      )}
      
      {/* Layout preview */}
      <div 
        className={cn(
          "w-full rounded border border-border p-2 shadow-sm",
          previewHeights[size]
        )}
        style={{ backgroundColor: "#fafafa" }}
      >
        <LayoutPreview layout={config.layout} accentColor={config.accentColor} />
      </div>
      
      {showDetails && (
        <>
          {/* Template name */}
          <div className="mt-2">
            <p className={cn(
              "font-medium text-foreground truncate",
              size === "sm" ? "text-xs" : "text-sm"
            )}>
              {config.label}
            </p>
            <p className={cn(
              "text-muted-foreground truncate",
              size === "sm" ? "text-[10px]" : "text-xs"
            )}>
              {industryShort}
            </p>
          </div>
          
          {/* Tags */}
          {size !== "sm" && tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {tags.map((tag) => (
                <Badge 
                  key={tag} 
                  variant="secondary" 
                  className={cn(
                    "text-[10px] px-1.5 py-0",
                    tag === "ATS Safe" && "bg-emerald-100 text-emerald-700 border-emerald-200",
                    tag === "Executive" && "bg-violet-100 text-violet-700 border-violet-200",
                    tag === "Leadership" && "bg-blue-100 text-blue-700 border-blue-200"
                  )}
                >
                  {tag === "ATS Safe" && <Shield className="h-2 w-2 mr-0.5" />}
                  {tag === "Executive" && <Briefcase className="h-2 w-2 mr-0.5" />}
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </>
      )}
    </button>
  )
}
