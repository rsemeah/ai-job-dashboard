"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { 
  Link2, 
  AlertTriangle, 
  CheckCircle2, 
  Info,
  Eye,
  EyeOff,
  FileText
} from "lucide-react"
import { cn } from "@/lib/utils"

export interface BulletProvenance {
  bullet_text: string
  source_evidence_id: string
  source_role: string
  source_company: string
  matched_requirement?: string
  keywords_used: string[]
  confidence?: "high" | "medium" | "low"
}

export interface ParagraphProvenance {
  paragraph_text: string
  job_theme_addressed: string
  evidence_ids_used: string[]
  claim_confidence: "high" | "medium" | "low"
}

interface ResumeWithProvenanceProps {
  resumeText: string
  bulletProvenance?: BulletProvenance[]
  showProvenance?: boolean
  onToggleProvenance?: (show: boolean) => void
  className?: string
}

/**
 * Renders a resume with provenance indicators on each bullet.
 * When provenance mode is enabled, bullets show their source evidence.
 */
export function ResumeWithProvenance({
  resumeText,
  bulletProvenance = [],
  showProvenance = false,
  onToggleProvenance,
  className,
}: ResumeWithProvenanceProps) {
  const [localShowProvenance, setLocalShowProvenance] = useState(showProvenance)
  
  const effectiveShow = onToggleProvenance ? showProvenance : localShowProvenance
  const toggleShow = onToggleProvenance || setLocalShowProvenance
  
  // Parse resume text into sections
  const lines = resumeText.split("\n")
  
  // Create a map of bullet text to provenance for quick lookup
  const provenanceMap = new Map<string, BulletProvenance>()
  bulletProvenance.forEach(p => {
    // Normalize bullet text for matching (remove leading bullet chars)
    const normalized = p.bullet_text.replace(/^[•\-\*]\s*/, "").trim().toLowerCase()
    provenanceMap.set(normalized, p)
  })
  
  // Find provenance for a line
  const findProvenance = (line: string): BulletProvenance | undefined => {
    const normalized = line.replace(/^[•\-\*]\s*/, "").trim().toLowerCase()
    
    // Exact match
    if (provenanceMap.has(normalized)) {
      return provenanceMap.get(normalized)
    }
    
    // Partial match (provenance text contains line or vice versa)
    for (const [key, prov] of provenanceMap.entries()) {
      if (normalized.includes(key.slice(0, 50)) || key.includes(normalized.slice(0, 50))) {
        return prov
      }
    }
    
    return undefined
  }
  
  const getConfidenceColor = (confidence?: string) => {
    switch (confidence) {
      case "high": return "text-green-600 bg-green-50 border-green-200"
      case "medium": return "text-amber-600 bg-amber-50 border-amber-200"
      case "low": return "text-red-600 bg-red-50 border-red-200"
      default: return "text-muted-foreground bg-muted border-border"
    }
  }
  
  const getConfidenceIcon = (confidence?: string) => {
    switch (confidence) {
      case "high": return <CheckCircle2 className="h-3 w-3" />
      case "medium": return <Info className="h-3 w-3" />
      case "low": return <AlertTriangle className="h-3 w-3" />
      default: return <AlertTriangle className="h-3 w-3" />
    }
  }

  return (
    <div className={cn("space-y-2", className)}>
      {/* Toggle provenance view */}
      {bulletProvenance.length > 0 && (
        <div className="flex items-center justify-between pb-2 border-b">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileText className="h-4 w-4" />
            <span>{bulletProvenance.length} bullets with evidence tracking</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => toggleShow(!effectiveShow)}
            className="gap-2"
          >
            {effectiveShow ? (
              <>
                <EyeOff className="h-3.5 w-3.5" />
                Hide Sources
              </>
            ) : (
              <>
                <Eye className="h-3.5 w-3.5" />
                Show Sources
              </>
            )}
          </Button>
        </div>
      )}
      
      <ScrollArea className="h-[500px] pr-4">
        <div className="font-mono text-sm bg-muted p-4 rounded-lg space-y-1">
          {lines.map((line, idx) => {
            const isBullet = line.trim().startsWith("•") || line.trim().startsWith("-") || line.trim().startsWith("*")
            const provenance = isBullet ? findProvenance(line) : undefined
            const hasProvenance = !!provenance
            const noProvenance = isBullet && !hasProvenance && effectiveShow
            
            // Non-bullet lines render normally
            if (!isBullet) {
              return (
                <div key={idx} className="whitespace-pre-wrap">
                  {line}
                </div>
              )
            }
            
            // Bullet lines with provenance display
            return (
              <div key={idx} className="group relative">
                <div className={cn(
                  "whitespace-pre-wrap rounded px-1 -mx-1 transition-colors",
                  effectiveShow && hasProvenance && "hover:bg-primary/5",
                  noProvenance && "bg-amber-50/50 border-l-2 border-amber-300"
                )}>
                  {line}
                  
                  {/* Provenance indicator */}
                  {effectiveShow && hasProvenance && provenance && (
                    <TooltipProvider>
                      <Popover>
                        <PopoverTrigger asChild>
                          <button className="inline-flex items-center gap-1 ml-2 align-middle">
                            <Badge 
                              variant="outline" 
                              className={cn(
                                "text-[10px] px-1.5 py-0 h-4 cursor-pointer hover:opacity-80 transition-opacity",
                                getConfidenceColor(provenance.confidence || "high")
                              )}
                            >
                              {getConfidenceIcon(provenance.confidence || "high")}
                              <Link2 className="h-2.5 w-2.5 ml-0.5" />
                            </Badge>
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80" align="start">
                          <div className="space-y-3">
                            <div>
                              <h4 className="font-medium text-sm flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                                Evidence Source
                              </h4>
                              <p className="text-xs text-muted-foreground mt-1">
                                This bullet is backed by verified evidence
                              </p>
                            </div>
                            
                            <Separator />
                            
                            <div className="space-y-2 text-sm">
                              <div>
                                <span className="text-muted-foreground">Role:</span>{" "}
                                <span className="font-medium">{provenance.source_role}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Company:</span>{" "}
                                <span className="font-medium">{provenance.source_company}</span>
                              </div>
                              {provenance.matched_requirement && (
                                <div>
                                  <span className="text-muted-foreground">Addresses:</span>{" "}
                                  <span className="text-xs">{provenance.matched_requirement}</span>
                                </div>
                              )}
                            </div>
                            
                            {provenance.keywords_used.length > 0 && (
                              <>
                                <Separator />
                                <div>
                                  <span className="text-xs text-muted-foreground">Keywords used:</span>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {provenance.keywords_used.slice(0, 5).map((kw, i) => (
                                      <Badge key={i} variant="secondary" className="text-[10px]">
                                        {kw}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              </>
                            )}
                            
                            <div className="text-[10px] text-muted-foreground pt-1 border-t">
                              Evidence ID: {provenance.source_evidence_id.slice(0, 8)}...
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </TooltipProvider>
                  )}
                  
                  {/* No provenance warning */}
                  {noProvenance && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge 
                            variant="outline" 
                            className="text-[10px] px-1.5 py-0 h-4 ml-2 align-middle text-amber-600 bg-amber-50 border-amber-200"
                          >
                            <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
                            AI suggested
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs max-w-xs">
                            This bullet doesn&apos;t have clear evidence backing. 
                            Verify before using or consider rephrasing.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </ScrollArea>
      
      {/* Legend */}
      {effectiveShow && bulletProvenance.length > 0 && (
        <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
          <div className="flex items-center gap-1">
            <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 text-green-600 bg-green-50 border-green-200">
              <CheckCircle2 className="h-2.5 w-2.5" />
            </Badge>
            <span>Evidence backed</span>
          </div>
          <div className="flex items-center gap-1">
            <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 text-amber-600 bg-amber-50 border-amber-200">
              <AlertTriangle className="h-2.5 w-2.5" />
            </Badge>
            <span>Needs verification</span>
          </div>
        </div>
      )}
    </div>
  )
}

interface CoverLetterWithProvenanceProps {
  coverLetterText: string
  paragraphProvenance?: ParagraphProvenance[]
  showProvenance?: boolean
  onToggleProvenance?: (show: boolean) => void
  className?: string
}

/**
 * Renders a cover letter with provenance indicators on each paragraph.
 */
export function CoverLetterWithProvenance({
  coverLetterText,
  paragraphProvenance = [],
  showProvenance = false,
  onToggleProvenance,
  className,
}: CoverLetterWithProvenanceProps) {
  const [localShowProvenance, setLocalShowProvenance] = useState(showProvenance)
  
  const effectiveShow = onToggleProvenance ? showProvenance : localShowProvenance
  const toggleShow = onToggleProvenance || setLocalShowProvenance
  
  // Split into paragraphs
  const paragraphs = coverLetterText.split("\n\n").filter(p => p.trim())
  
  // Create provenance map
  const provenanceMap = new Map<number, ParagraphProvenance>()
  paragraphProvenance.forEach((p, idx) => {
    provenanceMap.set(idx, p)
  })
  
  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case "high": return "border-l-green-500 bg-green-50/30"
      case "medium": return "border-l-amber-500 bg-amber-50/30"
      case "low": return "border-l-red-500 bg-red-50/30"
      default: return "border-l-muted"
    }
  }

  return (
    <div className={cn("space-y-2", className)}>
      {/* Toggle provenance view */}
      {paragraphProvenance.length > 0 && (
        <div className="flex items-center justify-between pb-2 border-b">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileText className="h-4 w-4" />
            <span>{paragraphProvenance.length} paragraphs with claim tracking</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => toggleShow(!effectiveShow)}
            className="gap-2"
          >
            {effectiveShow ? (
              <>
                <EyeOff className="h-3.5 w-3.5" />
                Hide Claims
              </>
            ) : (
              <>
                <Eye className="h-3.5 w-3.5" />
                Show Claims
              </>
            )}
          </Button>
        </div>
      )}
      
      <ScrollArea className="h-[500px] pr-4">
        <div className="prose prose-sm max-w-none space-y-4">
          {paragraphs.map((para, idx) => {
            const provenance = provenanceMap.get(idx)
            
            return (
              <div 
                key={idx}
                className={cn(
                  "whitespace-pre-wrap transition-colors rounded p-3",
                  effectiveShow && provenance && cn(
                    "border-l-4 pl-4",
                    getConfidenceColor(provenance.claim_confidence)
                  ),
                  !effectiveShow && "bg-muted"
                )}
              >
                {para}
                
                {effectiveShow && provenance && (
                  <div className="mt-2 pt-2 border-t border-dashed text-xs text-muted-foreground">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">Theme:</span>
                      <span>{provenance.job_theme_addressed}</span>
                      {provenance.evidence_ids_used.length > 0 && (
                        <>
                          <span className="text-muted-foreground/50">|</span>
                          <span>{provenance.evidence_ids_used.length} evidence refs</span>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}
