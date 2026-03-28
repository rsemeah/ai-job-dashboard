"use client"

import { useState } from "react"
import type { JobSource, Settings } from "@/lib/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Separator } from "@/components/ui/separator"
import { Gauge, Radio, Save, Info } from "lucide-react"
import { toast } from "sonner"
import { BackButton } from "@/components/back-button"

// Default settings when user hasn't configured anything
const defaultSettings: Settings = {
  active_resume: "",
  score_threshold: 75,
  source_toggles: {
    JOBOT: true,
    ZIPRECRUITER: true,
    GREENHOUSE: true,
    MANUAL: true,
  },
}

const sourceLabels: Record<JobSource, string> = {
  JOBOT: "Jobot",
  ZIPRECRUITER: "ZipRecruiter",
  GREENHOUSE: "Greenhouse",
  MANUAL: "Manual Entry",
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(defaultSettings)
  const [hasChanges, setHasChanges] = useState(false)

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
    // In production, this would save to Supabase
    toast.success("Settings saved successfully")
    setHasChanges(false)
  }

  const handleReset = () => {
    setSettings(defaultSettings)
    setHasChanges(false)
    toast.info("Settings reset to defaults")
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <BackButton fallbackHref="/" />
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <p className="text-xs font-medium tracking-[0.2em] uppercase text-muted-foreground">
            Configuration
          </p>
          <h1 className="text-3xl font-serif font-medium tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Fine-tune how HireWire processes and scores your jobs.
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleReset} disabled={!hasChanges} className="h-11 px-5">
            Reset
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges} className="h-11 px-5">
            <Save className="mr-2 h-4 w-4" />
            Save
          </Button>
        </div>
      </div>

      <div className="grid gap-6">
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
                Jobs with scores above this threshold will automatically be moved to Ready to Apply status.
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

        {/* Info Card */}
        <Card className="border-blue-500/30 bg-blue-500/5">
          <CardContent className="flex gap-4 pt-6">
            <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p className="font-medium text-blue-600 dark:text-blue-400">How HireWire Works</p>
              <p className="text-sm text-muted-foreground">
                HireWire processes jobs submitted through the URL input or added manually. 
                Your n8n workflow handles the AI scoring and analysis, then writes results back to Supabase.
                Configure your workflow to respect these settings for a personalized experience.
              </p>
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
