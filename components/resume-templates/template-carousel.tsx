"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ChevronLeft, ChevronRight, Grid3X3 } from "lucide-react"
import { 
  TEMPLATE_CONFIGS, 
  ALL_TEMPLATE_IDS,
  getTemplatesByIndustry,
} from "@/lib/resume-templates/config/resumeTemplates.config"
import type { TemplateId } from "@/lib/resume-templates/types/ResumeProps"
import { TemplatePreviewCard } from "./template-preview-card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface TemplateCarouselProps {
  selectedTemplateId: TemplateId
  onSelect: (templateId: TemplateId) => void
  recommendedTemplateId?: TemplateId
  previewData?: {
    name?: string
    title?: string
  }
  showAllButton?: boolean
  className?: string
}

// Get unique industries
function getUniqueIndustries(): string[] {
  const industries = new Set<string>()
  ALL_TEMPLATE_IDS.forEach((id) => {
    industries.add(TEMPLATE_CONFIGS[id].industry)
  })
  return Array.from(industries)
}

// Get recommended template based on target industry/role
export function getRecommendedTemplate(
  targetIndustry?: string | null,
  targetRole?: string | null,
  seniorityLevel?: string | null
): TemplateId {
  // Default fallback
  let recommended: TemplateId = "tech-engineer"
  
  const roleStr = (targetRole || "").toLowerCase()
  const industryStr = (targetIndustry || "").toLowerCase()
  const seniorityStr = (seniorityLevel || "").toLowerCase()
  
  // Technology roles
  if (
    roleStr.includes("engineer") || 
    roleStr.includes("developer") || 
    roleStr.includes("software") ||
    industryStr.includes("tech")
  ) {
    if (seniorityStr.includes("director") || seniorityStr.includes("vp") || seniorityStr.includes("lead") || seniorityStr.includes("principal")) {
      return "tech-lead"
    }
    return "tech-engineer"
  }
  
  // Finance roles
  if (industryStr.includes("finance") || industryStr.includes("bank") || industryStr.includes("investment")) {
    if (seniorityStr.includes("director") || seniorityStr.includes("vp")) {
      return "finance-director"
    }
    return "finance-analyst"
  }
  
  // Healthcare roles
  if (industryStr.includes("health") || industryStr.includes("medical") || industryStr.includes("clinical")) {
    if (seniorityStr.includes("director") || seniorityStr.includes("admin")) {
      return "health-admin"
    }
    return "health-clinical"
  }
  
  // Creative / Marketing roles
  if (
    roleStr.includes("marketing") || 
    roleStr.includes("designer") || 
    roleStr.includes("creative") ||
    roleStr.includes("brand")
  ) {
    if (seniorityStr.includes("director") || seniorityStr.includes("cmo") || seniorityStr.includes("head")) {
      return "creative-lead"
    }
    return "creative-ic"
  }
  
  // Legal roles
  if (industryStr.includes("legal") || roleStr.includes("attorney") || roleStr.includes("lawyer")) {
    if (seniorityStr.includes("partner") || seniorityStr.includes("senior")) {
      return "legal-partner"
    }
    return "legal-associate"
  }
  
  // Education roles
  if (industryStr.includes("education") || roleStr.includes("teacher") || roleStr.includes("professor")) {
    if (seniorityStr.includes("principal") || seniorityStr.includes("dean") || seniorityStr.includes("admin")) {
      return "edu-admin"
    }
    return "edu-teacher"
  }
  
  // Consulting roles
  if (industryStr.includes("consulting") || roleStr.includes("consultant")) {
    if (seniorityStr.includes("principal") || seniorityStr.includes("partner") || seniorityStr.includes("director")) {
      return "consulting-principal"
    }
    return "consulting-analyst"
  }
  
  // Sales roles
  if (roleStr.includes("sales") || roleStr.includes("account") || roleStr.includes("bdr") || roleStr.includes("sdr")) {
    if (seniorityStr.includes("vp") || seniorityStr.includes("director") || seniorityStr.includes("cro")) {
      return "sales-vp"
    }
    return "sales-ic"
  }
  
  // Operations roles
  if (roleStr.includes("operations") || roleStr.includes("supply chain") || roleStr.includes("logistics")) {
    if (seniorityStr.includes("director") || seniorityStr.includes("coo")) {
      return "ops-director"
    }
    return "ops-coordinator"
  }
  
  // Executive roles
  if (
    seniorityStr.includes("c-level") || 
    seniorityStr.includes("ceo") || 
    seniorityStr.includes("cto") ||
    seniorityStr.includes("founder") ||
    roleStr.includes("chief")
  ) {
    return "exec-csuite"
  }
  
  // Senior IC fallback
  if (seniorityStr.includes("senior") || seniorityStr.includes("staff")) {
    return "exec-senior-ic"
  }
  
  return recommended
}

export function TemplateCarousel({
  selectedTemplateId,
  onSelect,
  recommendedTemplateId,
  previewData,
  showAllButton = true,
  className,
}: TemplateCarouselProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  
  // Get current template index
  const currentIndex = ALL_TEMPLATE_IDS.indexOf(selectedTemplateId)
  
  const navigateTemplate = (direction: "prev" | "next") => {
    const newIndex = direction === "prev" 
      ? Math.max(0, currentIndex - 1)
      : Math.min(ALL_TEMPLATE_IDS.length - 1, currentIndex + 1)
    
    onSelect(ALL_TEMPLATE_IDS[newIndex])
  }
  
  const currentConfig = TEMPLATE_CONFIGS[selectedTemplateId]
  const industries = getUniqueIndustries()

  return (
    <div className={cn("space-y-3", className)}>
      {/* Selected template info */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">
            {currentConfig.label}
          </p>
          <p className="text-xs text-muted-foreground">
            {currentConfig.industry} • {currentConfig.atsNote.split(".")[0]}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Navigation arrows */}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => navigateTemplate("prev")}
            disabled={currentIndex === 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground tabular-nums">
            {currentIndex + 1} / {ALL_TEMPLATE_IDS.length}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => navigateTemplate("next")}
            disabled={currentIndex === ALL_TEMPLATE_IDS.length - 1}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          
          {/* See all templates button */}
          {showAllButton && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 ml-2">
                  <Grid3X3 className="h-4 w-4" />
                  See All
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh]">
                <DialogHeader>
                  <DialogTitle>Choose a Template</DialogTitle>
                </DialogHeader>
                <Tabs defaultValue={currentConfig.industry} className="w-full">
                  <TabsList className="w-full flex-wrap h-auto py-2 gap-1">
                    {industries.map((industry) => (
                      <TabsTrigger 
                        key={industry} 
                        value={industry}
                        className="text-xs px-3 py-1"
                      >
                        {industry.split(" ")[0]}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  <ScrollArea className="h-[50vh] mt-4">
                    {industries.map((industry) => (
                      <TabsContent key={industry} value={industry} className="mt-0">
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 p-1">
                          {getTemplatesByIndustry(industry).map((config) => (
                            <TemplatePreviewCard
                              key={config.id}
                              templateId={config.id}
                              isSelected={selectedTemplateId === config.id}
                              isRecommended={recommendedTemplateId === config.id}
                              onClick={() => {
                                onSelect(config.id)
                                setDialogOpen(false)
                              }}
                              previewData={previewData}
                              size="md"
                            />
                          ))}
                        </div>
                      </TabsContent>
                    ))}
                  </ScrollArea>
                </Tabs>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>
      
      {/* Single template preview with navigation */}
      <div className="flex items-center gap-4">
        {/* Left navigation */}
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 shrink-0"
          onClick={() => navigateTemplate("prev")}
          disabled={currentIndex === 0}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        
        {/* Current template preview */}
        <div className="flex-1 flex justify-center">
          <TemplatePreviewCard
            templateId={selectedTemplateId}
            isSelected={true}
            isRecommended={recommendedTemplateId === selectedTemplateId}
            onClick={() => {}}
            previewData={previewData}
            size="lg"
            showDetails={true}
          />
        </div>
        
        {/* Right navigation */}
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 shrink-0"
          onClick={() => navigateTemplate("next")}
          disabled={currentIndex === ALL_TEMPLATE_IDS.length - 1}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>
    </div>
  )
}
