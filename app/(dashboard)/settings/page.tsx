"use client"

import { useState } from "react"
import { mockSettings } from "@/lib/mock-data"
import type { JobSource, Settings } from "@/lib/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { FileText, Gauge, Radio, Save } from "lucide-react"
import { toast } from "sonner"

const resumeOptions = [
  { value: "base_resume_v1.pdf", label: "Base Resume v1" },
  { value: "base_resume_v2.pdf", label: "Base Resume v2" },
  { value: "base_resume_v3.pdf", label: "Base Resume v3 (Current)" },
  { value: "technical_resume.pdf", label: "Technical Resume" },
  { value: "management_resume.pdf", label: "Management Resume" },
]

const sourceLabels: Record<JobSource, string> = {
  JOBOT: "Jobot",
  ZIPRECRUITER: "ZipRecruiter",
  GREENHOUSE: "Greenhouse",
  MANUAL: "Manual Entry",
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(mockSettings)
  const [hasChanges, setHasChanges] = useState(false)

  const handleResumeChange = (value: string) => {
    setSettings(prev => ({ ...prev, active_resume: value }))
    setHasChanges(true)
  }

  const handleThresholdChange = (value: number[]) => {
    setSettings(prev => ({ ...prev, score_threshold: value[0] }))
    setHasChanges(true)
  }

  const handleSourceToggle = (source: JobSource) => {
    setSettings(prev => ({
      ...prev,
      source_toggles: {
        ...prev.source_toggles,
        [source]: !prev.source_toggles[source],
      },
    }))
    setHasChanges(true)
  }

  const handleSave = () => {
    // In a real app, this would save to the database
    toast.success("Settings saved successfully")
    setHasChanges(false)
  }

  const handleReset = () => {
    setSettings(mockSettings)
    setHasChanges(false)
    toast.info("Settings reset to defaults")
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Configure your job application engine
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReset} disabled={!hasChanges}>
            Reset
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges}>
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </Button>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Resume Selection */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle>Active Resume</CardTitle>
                <CardDescription>
                  Select the base resume to use for document generation
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="resume-select">Base Resume</Label>
                <Select
                  value={settings.active_resume}
                  onValueChange={handleResumeChange}
                >
                  <SelectTrigger id="resume-select" className="w-[300px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {resumeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  This resume will be used as the base for generating tailored resumes.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Score Threshold */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Gauge className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle>Score Threshold</CardTitle>
                <CardDescription>
                  Minimum score required to auto-approve jobs for application
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Minimum Score</Label>
                  <span className="text-2xl font-bold font-mono">
                    {settings.score_threshold}
                  </span>
                </div>
                <Slider
                  value={[settings.score_threshold]}
                  onValueChange={handleThresholdChange}
                  min={0}
                  max={100}
                  step={5}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0</span>
                  <span>25</span>
                  <span>50</span>
                  <span>75</span>
                  <span>100</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Jobs with scores above this threshold will automatically be moved to READY_TO_APPLY status.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Source Toggles */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Radio className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle>Job Sources</CardTitle>
                <CardDescription>
                  Enable or disable job ingestion from specific sources
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(Object.keys(settings.source_toggles) as JobSource[]).map((source, index) => (
                <div key={source}>
                  {index > 0 && <Separator className="my-4" />}
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor={`source-${source}`} className="text-base cursor-pointer">
                        {sourceLabels[source]}
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        {source === "MANUAL" 
                          ? "Allow manually added jobs"
                          : `Ingest jobs from ${sourceLabels[source]}`
                        }
                      </p>
                    </div>
                    <Switch
                      id={`source-${source}`}
                      checked={settings.source_toggles[source]}
                      onCheckedChange={() => handleSourceToggle(source)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
            <CardDescription>
              Irreversible actions that affect your data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg border border-destructive/20 bg-destructive/5">
              <div>
                <p className="font-medium">Clear All Workflow Logs</p>
                <p className="text-sm text-muted-foreground">
                  Delete all workflow execution logs. This cannot be undone.
                </p>
              </div>
              <Button variant="destructive" size="sm">
                Clear Logs
              </Button>
            </div>
            <div className="flex items-center justify-between p-4 rounded-lg border border-destructive/20 bg-destructive/5">
              <div>
                <p className="font-medium">Archive All Rejected Jobs</p>
                <p className="text-sm text-muted-foreground">
                  Move all rejected jobs to archived status.
                </p>
              </div>
              <Button variant="destructive" size="sm">
                Archive Rejected
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Save indicator */}
      {hasChanges && (
        <div className="fixed bottom-6 right-6 bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
          <span className="text-sm">You have unsaved changes</span>
          <Button size="sm" variant="secondary" onClick={handleSave}>
            Save
          </Button>
        </div>
      )}
    </div>
  )
}
