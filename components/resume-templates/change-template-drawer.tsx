"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Palette, Check, Sparkles } from "lucide-react"
import { 
  TEMPLATE_CONFIGS, 
  ALL_TEMPLATE_IDS,
  getTemplatesByIndustry,
} from "@/lib/resume-templates/config/resumeTemplates.config"
import type { TemplateId } from "@/lib/resume-templates/types/ResumeProps"
import { TemplatePreviewCard } from "./template-preview-card"
import { getRecommendedTemplate } from "./template-carousel"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface ChangeTemplateDrawerProps {
  currentTemplateId: TemplateId
  onChangeTemplate: (templateId: TemplateId) => void
  targetIndustry?: string | null
  targetRole?: string | null
  seniorityLevel?: string | null
  trigger?: React.ReactNode
  disabled?: boolean
}

// Get unique industries for tabs
function getUniqueIndustries(): string[] {
  const industries = new Set<string>()
  ALL_TEMPLATE_IDS.forEach((id) => {
    industries.add(TEMPLATE_CONFIGS[id].industry)
  })
  return Array.from(industries)
}

export function ChangeTemplateDrawer({
  currentTemplateId,
  onChangeTemplate,
  targetIndustry,
  targetRole,
  seniorityLevel,
  trigger,
  disabled = false,
}: ChangeTemplateDrawerProps) {
  const [open, setOpen] = useState(false)
  const [pendingTemplateId, setPendingTemplateId] = useState<TemplateId>(currentTemplateId)
  
  const recommendedTemplateId = getRecommendedTemplate(
    targetIndustry,
    targetRole,
    seniorityLevel
  )
  
  const currentConfig = TEMPLATE_CONFIGS[currentTemplateId]
  const pendingConfig = TEMPLATE_CONFIGS[pendingTemplateId]
  const industries = getUniqueIndustries()
  
  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen)
    if (isOpen) {
      setPendingTemplateId(currentTemplateId)
    }
  }
  
  const handleSelect = useCallback((templateId: TemplateId) => {
    setPendingTemplateId(templateId)
  }, [])
  
  const handleApply = useCallback(() => {
    if (pendingTemplateId !== currentTemplateId) {
      onChangeTemplate(pendingTemplateId)
    }
    setOpen(false)
  }, [pendingTemplateId, currentTemplateId, onChangeTemplate])
  
  const hasChanges = pendingTemplateId !== currentTemplateId
  
  return (
    <Sheet open={open} onOpenChange={handleOpen}>
      <SheetTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2" disabled={disabled}>
            <Palette className="h-4 w-4" />
            Change Template
          </Button>
        )}
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Change Resume Template</SheetTitle>
          <SheetDescription>
            Switch templates without regenerating content. Your resume data will be instantly re-rendered.
          </SheetDescription>
        </SheetHeader>
        
        <div className="mt-6 space-y-6">
          {/* Current vs New preview */}
          <div className="flex gap-4">
            {/* Current */}
            <div className="flex-1 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Current</p>
              <div className={cn(
                "p-3 rounded-lg border bg-muted/30",
                !hasChanges && "border-primary"
              )}>
                <p className="text-sm font-medium truncate">{currentConfig.label}</p>
                <p className="text-xs text-muted-foreground">{currentConfig.industry}</p>
              </div>
            </div>
            
            {/* New */}
            {hasChanges && (
              <div className="flex-1 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">New</p>
                <div className="p-3 rounded-lg border border-primary bg-primary/5">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{pendingConfig.label}</p>
                    <Check className="h-4 w-4 text-primary flex-shrink-0" />
                  </div>
                  <p className="text-xs text-muted-foreground">{pendingConfig.industry}</p>
                </div>
              </div>
            )}
          </div>
          
          {/* Template grid by industry */}
          <Tabs defaultValue={currentConfig.industry} className="w-full">
            <TabsList className="w-full flex-wrap h-auto py-2 gap-1 justify-start">
              {industries.map((industry) => (
                <TabsTrigger 
                  key={industry} 
                  value={industry}
                  className="text-xs px-2 py-1"
                >
                  {industry.split(" ")[0]}
                </TabsTrigger>
              ))}
            </TabsList>
            
            <ScrollArea className="h-[50vh] mt-4 pr-4">
              {industries.map((industry) => (
                <TabsContent key={industry} value={industry} className="mt-0">
                  <div className="grid grid-cols-2 gap-3">
                    {getTemplatesByIndustry(industry).map((config) => (
                      <TemplatePreviewCard
                        key={config.id}
                        templateId={config.id}
                        isSelected={pendingTemplateId === config.id}
                        isRecommended={recommendedTemplateId === config.id && pendingTemplateId !== config.id}
                        onClick={() => handleSelect(config.id)}
                        size="md"
                      />
                    ))}
                  </div>
                </TabsContent>
              ))}
            </ScrollArea>
          </Tabs>
          
          {/* Apply button */}
          <div className="flex items-center gap-3 pt-4 border-t">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 gap-2"
              onClick={handleApply}
              disabled={!hasChanges}
            >
              <Check className="h-4 w-4" />
              Apply Template
            </Button>
          </div>
          
          {/* Info note */}
          <p className="text-xs text-muted-foreground text-center">
            Template changes are instant. No regeneration needed.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  )
}
