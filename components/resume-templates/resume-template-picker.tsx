"use client"

import { useState, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Sparkles, FileText, Shield, RefreshCw, Loader2 } from "lucide-react"
import { TemplateCarousel, getRecommendedTemplate } from "./template-carousel"
import { TEMPLATE_CONFIGS } from "@/lib/resume-templates/config/resumeTemplates.config"
import type { TemplateId } from "@/lib/resume-templates/types/ResumeProps"

interface ResumeTemplatePickerProps {
  selectedTemplateId: TemplateId | null
  onSelectTemplate: (templateId: TemplateId) => void
  onGenerate: (templateId: TemplateId) => void
  isGenerating?: boolean
  targetIndustry?: string | null
  targetRole?: string | null
  seniorityLevel?: string | null
  previewData?: {
    name?: string
    title?: string
  }
  hasExistingResume?: boolean
  className?: string
}

export function ResumeTemplatePicker({
  selectedTemplateId,
  onSelectTemplate,
  onGenerate,
  isGenerating = false,
  targetIndustry,
  targetRole,
  seniorityLevel,
  previewData,
  hasExistingResume = false,
  className,
}: ResumeTemplatePickerProps) {
  // Get recommended template based on job info
  const recommendedTemplateId = getRecommendedTemplate(
    targetIndustry,
    targetRole,
    seniorityLevel
  )
  
  // Use recommended if no selection
  const effectiveTemplateId = selectedTemplateId || recommendedTemplateId
  const currentConfig = TEMPLATE_CONFIGS[effectiveTemplateId]
  
  // Track if user is using recommended
  const isUsingRecommended = effectiveTemplateId === recommendedTemplateId
  
  const handleGenerate = useCallback(() => {
    onGenerate(effectiveTemplateId)
  }, [effectiveTemplateId, onGenerate])

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-4 bg-muted/30 border-b">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Resume Template
            </CardTitle>
            <CardDescription className="mt-1">
              Choose a template style before generating your resume
            </CardDescription>
          </div>
          
          {/* Recommended badge */}
          {isUsingRecommended && (
            <Badge 
              variant="secondary" 
              className="bg-amber-100 text-amber-700 border-amber-200"
            >
              <Sparkles className="h-3 w-3 mr-1" />
              Recommended
            </Badge>
          )}
        </div>
        
        {/* Recommendation reasoning */}
        {isUsingRecommended && (
          <p className="text-xs text-muted-foreground mt-2">
            Based on {targetRole ? `"${targetRole}"` : "this role"} 
            {targetIndustry ? ` in ${targetIndustry}` : ""}, 
            we recommend the <strong>{currentConfig.label}</strong> template.
          </p>
        )}
      </CardHeader>
      
      <CardContent className="p-4 space-y-4">
        {/* Template carousel */}
        <TemplateCarousel
          selectedTemplateId={effectiveTemplateId}
          onSelect={onSelectTemplate}
          recommendedTemplateId={recommendedTemplateId}
          previewData={previewData}
          showAllButton={true}
        />
        
        {/* Selected template details */}
        <div className="flex items-start justify-between p-3 rounded-lg bg-muted/50 border">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{currentConfig.label}</span>
              {currentConfig.layout === "single-column" && (
                <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                  <Shield className="h-2 w-2 mr-0.5" />
                  ATS Safe
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {currentConfig.atsNote}
            </p>
          </div>
        </div>
        
        {/* Generate button */}
        <Button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="w-full gap-2"
          size="lg"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : hasExistingResume ? (
            <>
              <RefreshCw className="h-4 w-4" />
              Regenerate with {currentConfig.label}
            </>
          ) : (
            <>
              <FileText className="h-4 w-4" />
              Generate with {currentConfig.label}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
