"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Briefcase,
  GraduationCap,
  Wrench,
  Award,
  FolderOpen,
  Plus,
  Loader2,
  Trash2,
  Search,
} from "lucide-react"

type SourceType = "work_experience" | "education" | "skill" | "certification" | "project"

interface EvidenceItem {
  id: string
  source_type: SourceType
  source_title: string
  role_name: string | null
  company_name: string | null
  date_range: string | null
  responsibilities: string[] | null
  tools_used: string[] | null
  outcomes: string[] | null
  confidence_level: string | null
  is_active: boolean
  created_at: string
}

const SOURCE_TYPE_CONFIG: Record<SourceType, { label: string; icon: React.ElementType; color: string }> = {
  work_experience: { label: "Work Experience", icon: Briefcase, color: "bg-blue-50 text-blue-700 border-blue-200" },
  education:       { label: "Education",       icon: GraduationCap, color: "bg-green-50 text-green-700 border-green-200" },
  skill:           { label: "Skill",           icon: Wrench, color: "bg-purple-50 text-purple-700 border-purple-200" },
  certification:   { label: "Certification",   icon: Award, color: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  project:         { label: "Project",         icon: FolderOpen, color: "bg-orange-50 text-orange-700 border-orange-200" },
}

const EMPTY_FORM = {
  source_type: "work_experience" as SourceType,
  source_title: "",
  role_name: "",
  company_name: "",
  date_range: "",
  responsibilities: "",
  tools_used: "",
  outcomes: "",
}

export default function EvidencePage() {
  const [items, setItems] = useState<EvidenceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filterType, setFilterType] = useState<SourceType | "all">("all")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchEvidence = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from("evidence_library")
      .select("id, source_type, source_title, role_name, company_name, date_range, responsibilities, tools_used, outcomes, confidence_level, is_active, created_at")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false })

    setItems(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchEvidence() }, [fetchEvidence])

  const handleAdd = async () => {
    if (!form.source_title.trim()) { setSaveError("Title is required"); return }
    setSaving(true)
    setSaveError(null)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      const { error } = await supabase.from("evidence_library").insert({
        user_id: user.id,
        source_type: form.source_type,
        source_title: form.source_title.trim(),
        role_name: form.role_name.trim() || null,
        company_name: form.company_name.trim() || null,
        date_range: form.date_range.trim() || null,
        responsibilities: form.responsibilities.trim()
          ? form.responsibilities.split("\n").map(s => s.trim()).filter(Boolean)
          : null,
        tools_used: form.tools_used.trim()
          ? form.tools_used.split(",").map(s => s.trim()).filter(Boolean)
          : null,
        outcomes: form.outcomes.trim()
          ? form.outcomes.split("\n").map(s => s.trim()).filter(Boolean)
          : null,
        confidence_level: "medium",
        evidence_weight: "medium",
        is_user_approved: true,
        is_active: true,
        priority_rank: 0,
      })
      if (error) throw error
      setForm(EMPTY_FORM)
      setDialogOpen(false)
      fetchEvidence()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    const supabase = createClient()
    await supabase
      .from("evidence_library")
      .update({ is_active: false })
      .eq("id", id)
    setItems(prev => prev.filter(i => i.id !== id))
    setDeletingId(null)
  }

  const filtered = items.filter(item => {
    const matchesType = filterType === "all" || item.source_type === filterType
    const searchLower = search.toLowerCase()
    const matchesSearch = !search ||
      item.source_title?.toLowerCase().includes(searchLower) ||
      item.company_name?.toLowerCase().includes(searchLower) ||
      item.role_name?.toLowerCase().includes(searchLower) ||
      (item.tools_used || []).some(t => t.toLowerCase().includes(searchLower))
    return matchesType && matchesSearch
  })

  const counts = items.reduce((acc, item) => {
    acc[item.source_type] = (acc[item.source_type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Evidence Library</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {items.length} item{items.length !== 1 ? "s" : ""} — your professional proof points used in every analysis.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#7B1212] hover:bg-[#6a0f0f] text-white">
              <Plus className="h-4 w-4 mr-2" />
              Add evidence
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Evidence</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select
                  value={form.source_type}
                  onValueChange={v => setForm(f => ({ ...f, source_type: v as SourceType }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(SOURCE_TYPE_CONFIG).map(([key, cfg]) => (
                      <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Title <span className="text-red-500">*</span></Label>
                <Input
                  value={form.source_title}
                  onChange={e => setForm(f => ({ ...f, source_title: e.target.value }))}
                  placeholder="e.g. Senior Product Manager at Acme Corp"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Role / Degree</Label>
                  <Input
                    value={form.role_name}
                    onChange={e => setForm(f => ({ ...f, role_name: e.target.value }))}
                    placeholder="e.g. Senior PM"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Company / School</Label>
                  <Input
                    value={form.company_name}
                    onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))}
                    placeholder="e.g. Acme Corp"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Date range</Label>
                <Input
                  value={form.date_range}
                  onChange={e => setForm(f => ({ ...f, date_range: e.target.value }))}
                  placeholder="e.g. Jan 2020 – Dec 2022"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Responsibilities (one per line)</Label>
                <Textarea
                  value={form.responsibilities}
                  onChange={e => setForm(f => ({ ...f, responsibilities: e.target.value }))}
                  placeholder="Led cross-functional team of 8 engineers&#10;Launched 3 major product features..."
                  rows={3}
                  className="resize-none"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Tools / Skills (comma-separated)</Label>
                <Input
                  value={form.tools_used}
                  onChange={e => setForm(f => ({ ...f, tools_used: e.target.value }))}
                  placeholder="e.g. Python, Jira, Figma, SQL"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Outcomes / Results (one per line)</Label>
                <Textarea
                  value={form.outcomes}
                  onChange={e => setForm(f => ({ ...f, outcomes: e.target.value }))}
                  placeholder="Increased revenue by 23%&#10;Reduced churn by 15%..."
                  rows={2}
                  className="resize-none"
                />
              </div>
              {saveError && <p className="text-sm text-red-600">{saveError}</p>}
              <Button
                className="w-full bg-[#7B1212] hover:bg-[#6a0f0f] text-white"
                onClick={handleAdd}
                disabled={saving}
              >
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                {saving ? "Saving..." : "Add to library"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Type filter chips */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilterType("all")}
          className={`px-3 py-1 rounded-full text-sm border transition-colors ${filterType === "all" ? "bg-foreground text-background border-foreground" : "bg-background text-muted-foreground border-border hover:border-foreground"}`}
        >
          All ({items.length})
        </button>
        {Object.entries(SOURCE_TYPE_CONFIG).map(([key, cfg]) => (
          counts[key] > 0 && (
            <button
              key={key}
              onClick={() => setFilterType(filterType === key ? "all" : key as SourceType)}
              className={`px-3 py-1 rounded-full text-sm border transition-colors ${filterType === key ? "bg-foreground text-background border-foreground" : "bg-background text-muted-foreground border-border hover:border-foreground"}`}
            >
              {cfg.label} ({counts[key]})
            </button>
          )
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by title, company, or skill..."
          className="pl-9"
        />
      </div>

      {/* Items */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-lg">
          <p className="text-muted-foreground text-sm">
            {search || filterType !== "all" ? "No items match your filters." : "No evidence items yet. Upload your resume or add items manually."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(item => {
            const cfg = SOURCE_TYPE_CONFIG[item.source_type]
            const Icon = cfg.icon
            return (
              <div key={item.id} className="border border-border rounded-lg p-4 bg-card">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={`p-1.5 rounded border ${cfg.color} shrink-0`}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.source_title}</p>
                      {(item.role_name || item.company_name) && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {[item.role_name, item.company_name].filter(Boolean).join(" at ")}
                          {item.date_range && ` · ${item.date_range}`}
                        </p>
                      )}
                      {(item.tools_used || []).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {(item.tools_used || []).slice(0, 5).map(tool => (
                            <span key={tool} className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                              {tool}
                            </span>
                          ))}
                          {(item.tools_used || []).length > 5 && (
                            <span className="text-xs text-muted-foreground">+{(item.tools_used || []).length - 5} more</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="secondary" className="text-xs">{cfg.label}</Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-red-600"
                      onClick={() => handleDelete(item.id)}
                      disabled={deletingId === item.id}
                      aria-label="Delete evidence item"
                    >
                      {deletingId === item.id
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Trash2 className="h-3.5 w-3.5" />
                      }
                    </Button>
                  </div>
                </div>
                {(item.responsibilities || []).length > 0 && (
                  <>
                    <Separator className="my-3" />
                    <ul className="space-y-1">
                      {(item.responsibilities || []).slice(0, 2).map((r, i) => (
                        <li key={i} className="text-xs text-muted-foreground flex gap-1.5">
                          <span className="text-foreground/30 shrink-0">—</span>
                          {r}
                        </li>
                      ))}
                      {(item.responsibilities || []).length > 2 && (
                        <li className="text-xs text-muted-foreground">
                          +{(item.responsibilities || []).length - 2} more responsibilities
                        </li>
                      )}
                    </ul>
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
