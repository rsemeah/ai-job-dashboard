"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Search,
  Plus,
  MoreHorizontal,
  Edit2,
  Trash2,
  Archive,
  Eye,
  EyeOff,
  Filter,
  ArrowUpDown,
  Briefcase,
  Building2,
  Calendar,
  Target,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  FileText,
  Award,
  Wrench,
} from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import type { EvidenceRecord } from "@/lib/types"
import { cn } from "@/lib/utils"
import { BackButton } from "@/components/back-button"

type SortField = "priority_rank" | "created_at" | "role_name" | "company_name"
type SortOrder = "asc" | "desc"
type FilterStatus = "all" | "active" | "archived"

export default function EvidenceLibraryPage() {
  const [evidence, setEvidence] = useState<EvidenceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("active")
  const [sortField, setSortField] = useState<SortField>("priority_rank")
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc")
  const [expandedId, setExpandedId] = useState<string | null>(null)
  
  // Dialog states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingEvidence, setEditingEvidence] = useState<EvidenceRecord | null>(null)
  const [saving, setSaving] = useState(false)
  
  // Form state
  const [formData, setFormData] = useState({
    role_name: "",
    company_name: "",
    date_range: "",
    project_name: "",
    business_goal: "",
    user_problem: "",
    what_shipped: "",
    what_visible: "",
    outcomes: [] as string[],
    tools_used: [] as string[],
    responsibilities: [] as string[],
    industries: [] as string[],
    role_family_tags: [] as string[],
    approved_achievement_bullets: [] as string[],
    evidence_weight: "medium",
    confidence_level: "high",
  })

  // Load evidence
  useEffect(() => {
    loadEvidence()
  }, [])

  async function loadEvidence() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from("evidence_library")
      .select("*")
      .eq("user_id", user.id)
      .order("priority_rank", { ascending: true })

    if (error) {
      toast.error("Failed to load evidence library")
      console.error(error)
    } else {
      setEvidence(data as EvidenceRecord[])
    }
    
    setLoading(false)
  }

  // Filter and sort evidence
  const filteredEvidence = useMemo(() => {
    let result = [...evidence]
    
    // Filter by status
    if (filterStatus === "active") {
      result = result.filter(e => e.is_active)
    } else if (filterStatus === "archived") {
      result = result.filter(e => !e.is_active)
    }
    
    // Search
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(e => 
        e.role_name?.toLowerCase().includes(query) ||
        e.company_name?.toLowerCase().includes(query) ||
        e.project_name?.toLowerCase().includes(query) ||
        e.what_shipped?.toLowerCase().includes(query) ||
        e.outcomes?.some(o => o.toLowerCase().includes(query)) ||
        e.tools_used?.some(t => t.toLowerCase().includes(query))
      )
    }
    
    // Sort
    result.sort((a, b) => {
      let aVal: string | number | null = null
      let bVal: string | number | null = null
      
      switch (sortField) {
        case "priority_rank":
          aVal = a.priority_rank ?? 999
          bVal = b.priority_rank ?? 999
          break
        case "created_at":
          aVal = a.created_at ?? ""
          bVal = b.created_at ?? ""
          break
        case "role_name":
          aVal = a.role_name ?? ""
          bVal = b.role_name ?? ""
          break
        case "company_name":
          aVal = a.company_name ?? ""
          bVal = b.company_name ?? ""
          break
      }
      
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortOrder === "asc" ? aVal - bVal : bVal - aVal
      }
      
      const comparison = String(aVal).localeCompare(String(bVal))
      return sortOrder === "asc" ? comparison : -comparison
    })
    
    return result
  }, [evidence, filterStatus, searchQuery, sortField, sortOrder])

  // CRUD operations
  async function handleAddEvidence() {
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      toast.error("Please log in")
      setSaving(false)
      return
    }

    const { error } = await supabase
      .from("evidence_library")
      .insert({
        user_id: user.id,
        ...formData,
        is_active: true,
        is_user_approved: true,
        priority_rank: evidence.length + 1,
      })

    if (error) {
      toast.error("Failed to add evidence")
      console.error(error)
    } else {
      toast.success("Evidence added successfully")
      setIsAddDialogOpen(false)
      resetForm()
      loadEvidence()
    }
    
    setSaving(false)
  }

  async function handleUpdateEvidence() {
    if (!editingEvidence) return
    
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      toast.error("Please log in")
      setSaving(false)
      return
    }

    const { error } = await supabase
      .from("evidence_library")
      .update(formData)
      .eq("id", editingEvidence.id)
      .eq("user_id", user.id)

    if (error) {
      toast.error("Failed to update evidence")
      console.error(error)
    } else {
      toast.success("Evidence updated successfully")
      setIsEditDialogOpen(false)
      setEditingEvidence(null)
      resetForm()
      loadEvidence()
    }
    
    setSaving(false)
  }

  async function handleToggleActive(id: string, currentActive: boolean) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return

    const { error } = await supabase
      .from("evidence_library")
      .update({ is_active: !currentActive })
      .eq("id", id)
      .eq("user_id", user.id)

    if (error) {
      toast.error("Failed to update evidence")
    } else {
      toast.success(currentActive ? "Evidence archived" : "Evidence restored")
      loadEvidence()
    }
  }

  async function handleDelete(id: string) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return

    const { error } = await supabase
      .from("evidence_library")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)

    if (error) {
      toast.error("Failed to delete evidence")
    } else {
      toast.success("Evidence deleted")
      loadEvidence()
    }
  }

  function openEditDialog(item: EvidenceRecord) {
    setEditingEvidence(item)
    setFormData({
      role_name: item.role_name || "",
      company_name: item.company_name || "",
      date_range: item.date_range || "",
      project_name: item.project_name || "",
      business_goal: item.business_goal || "",
      user_problem: item.user_problem || "",
      what_shipped: item.what_shipped || "",
      what_visible: item.what_visible || "",
      outcomes: item.outcomes || [],
      tools_used: item.tools_used || [],
      responsibilities: item.responsibilities || [],
      industries: item.industries || [],
      role_family_tags: item.role_family_tags || [],
      approved_achievement_bullets: item.approved_achievement_bullets || [],
      evidence_weight: item.evidence_weight || "medium",
      confidence_level: item.confidence_level || "high",
    })
    setIsEditDialogOpen(true)
  }

  function resetForm() {
    setFormData({
      role_name: "",
      company_name: "",
      date_range: "",
      project_name: "",
      business_goal: "",
      user_problem: "",
      what_shipped: "",
      what_visible: "",
      outcomes: [],
      tools_used: [],
      responsibilities: [],
      industries: [],
      role_family_tags: [],
      approved_achievement_bullets: [],
      evidence_weight: "medium",
      confidence_level: "high",
    })
  }

  // Helper to update array fields
  function updateArrayField(field: keyof typeof formData, value: string) {
    const items = value.split(",").map(s => s.trim()).filter(Boolean)
    setFormData(prev => ({ ...prev, [field]: items }))
  }

  // Stats
  const activeCount = evidence.filter(e => e.is_active).length
  const archivedCount = evidence.filter(e => !e.is_active).length
  const totalOutcomes = evidence.reduce((acc, e) => acc + (e.outcomes?.length || 0), 0)

  if (loading) {
    return (
      <div className="space-y-6">
        <BackButton fallbackHref="/" />
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <BackButton fallbackHref="/" />
      
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Evidence Library</h1>
          <p className="text-muted-foreground">
            Manage your career achievements, projects, and accomplishments
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Evidence
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Evidence</DialogTitle>
              <DialogDescription>
                Add a new career achievement or project to your evidence library
              </DialogDescription>
            </DialogHeader>
            <EvidenceForm
              formData={formData}
              setFormData={setFormData}
              updateArrayField={updateArrayField}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddEvidence} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Evidence
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Total Evidence</span>
            </div>
            <p className="text-2xl font-bold mt-1">{evidence.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium text-muted-foreground">Active</span>
            </div>
            <p className="text-2xl font-bold mt-1">{activeCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Archive className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Archived</span>
            </div>
            <p className="text-2xl font-bold mt-1">{archivedCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-yellow-500" />
              <span className="text-sm font-medium text-muted-foreground">Total Outcomes</span>
            </div>
            <p className="text-2xl font-bold mt-1">{totalOutcomes}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by role, company, project, or skills..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as FilterStatus)}>
                <SelectTrigger className="w-[130px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortField} onValueChange={(v) => setSortField(v as SortField)}>
                <SelectTrigger className="w-[150px]">
                  <ArrowUpDown className="mr-2 h-4 w-4" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="priority_rank">Priority</SelectItem>
                  <SelectItem value="created_at">Date Added</SelectItem>
                  <SelectItem value="role_name">Role Name</SelectItem>
                  <SelectItem value="company_name">Company</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSortOrder(o => o === "asc" ? "desc" : "asc")}
              >
                {sortOrder === "asc" ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Evidence List */}
      {filteredEvidence.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No evidence found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || filterStatus !== "all"
                ? "Try adjusting your search or filters"
                : "Add your first career achievement to get started"
              }
            </p>
            {!searchQuery && filterStatus === "all" && (
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Evidence
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredEvidence.map((item) => (
            <EvidenceCard
              key={item.id}
              item={item}
              isExpanded={expandedId === item.id}
              onToggleExpand={() => setExpandedId(expandedId === item.id ? null : item.id)}
              onEdit={() => openEditDialog(item)}
              onToggleActive={() => handleToggleActive(item.id, item.is_active)}
              onDelete={() => handleDelete(item.id)}
            />
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Evidence</DialogTitle>
            <DialogDescription>
              Update this career achievement or project
            </DialogDescription>
          </DialogHeader>
          <EvidenceForm
            formData={formData}
            setFormData={setFormData}
            updateArrayField={updateArrayField}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateEvidence} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Evidence Card Component
function EvidenceCard({
  item,
  isExpanded,
  onToggleExpand,
  onEdit,
  onToggleActive,
  onDelete,
}: {
  item: EvidenceRecord
  isExpanded: boolean
  onToggleExpand: () => void
  onEdit: () => void
  onToggleActive: () => void
  onDelete: () => void
}) {
  return (
    <Card className={cn(!item.is_active && "opacity-60")}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-lg">{item.role_name || "Untitled Role"}</CardTitle>
              {item.is_active ? (
                <Badge variant="outline" className="text-green-600 border-green-600">
                  Active
                </Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground">
                  Archived
                </Badge>
              )}
              {item.evidence_weight && (
                <Badge variant="secondary" className="capitalize">
                  {item.evidence_weight} weight
                </Badge>
              )}
            </div>
            <CardDescription className="mt-1">
              {item.company_name && (
                <span className="inline-flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  {item.company_name}
                </span>
              )}
              {item.company_name && item.date_range && " • "}
              {item.date_range && (
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {item.date_range}
                </span>
              )}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onToggleExpand}>
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onEdit}>
                  <Edit2 className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onToggleActive}>
                  {item.is_active ? (
                    <>
                      <Archive className="mr-2 h-4 w-4" />
                      Archive
                    </>
                  ) : (
                    <>
                      <Eye className="mr-2 h-4 w-4" />
                      Restore
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={onDelete}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      {/* Preview Content */}
      <CardContent className="pt-0">
        {item.project_name && (
          <p className="text-sm text-muted-foreground mb-2">
            <span className="font-medium">Project:</span> {item.project_name}
          </p>
        )}
        
        {/* Tools/Skills badges */}
        {item.tools_used && item.tools_used.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {item.tools_used.slice(0, isExpanded ? undefined : 5).map((tool, i) => (
              <Badge key={i} variant="secondary" className="text-xs">
                {tool}
              </Badge>
            ))}
            {!isExpanded && item.tools_used.length > 5 && (
              <Badge variant="outline" className="text-xs">
                +{item.tools_used.length - 5} more
              </Badge>
            )}
          </div>
        )}

        {/* Expanded Content */}
        {isExpanded && (
          <div className="mt-4 space-y-4 border-t pt-4">
            {item.what_shipped && (
              <div>
                <h4 className="text-sm font-medium mb-1">What I Shipped</h4>
                <p className="text-sm text-muted-foreground">{item.what_shipped}</p>
              </div>
            )}
            
            {item.business_goal && (
              <div>
                <h4 className="text-sm font-medium mb-1">Business Goal</h4>
                <p className="text-sm text-muted-foreground">{item.business_goal}</p>
              </div>
            )}
            
            {item.outcomes && item.outcomes.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-1">Outcomes</h4>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  {item.outcomes.map((outcome, i) => (
                    <li key={i}>{outcome}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {item.responsibilities && item.responsibilities.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-1">Responsibilities</h4>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  {item.responsibilities.map((resp, i) => (
                    <li key={i}>{resp}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {item.approved_achievement_bullets && item.approved_achievement_bullets.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-1 flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-yellow-500" />
                  Approved Bullets
                </h4>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  {item.approved_achievement_bullets.map((bullet, i) => (
                    <li key={i}>{bullet}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {item.industries && item.industries.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-1">Industries</h4>
                <div className="flex flex-wrap gap-1">
                  {item.industries.map((industry, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {industry}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Evidence Form Component
function EvidenceForm({
  formData,
  setFormData,
  updateArrayField,
}: {
  formData: {
    role_name: string
    company_name: string
    date_range: string
    project_name: string
    business_goal: string
    user_problem: string
    what_shipped: string
    what_visible: string
    outcomes: string[]
    tools_used: string[]
    responsibilities: string[]
    industries: string[]
    role_family_tags: string[]
    approved_achievement_bullets: string[]
    evidence_weight: string
    confidence_level: string
  }
  setFormData: React.Dispatch<React.SetStateAction<typeof formData>>
  updateArrayField: (field: keyof typeof formData, value: string) => void
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="role_name">Role Name *</Label>
          <Input
            id="role_name"
            placeholder="e.g., Senior Product Manager"
            value={formData.role_name}
            onChange={(e) => setFormData(prev => ({ ...prev, role_name: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="company_name">Company</Label>
          <Input
            id="company_name"
            placeholder="e.g., Acme Corp"
            value={formData.company_name}
            onChange={(e) => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="date_range">Date Range</Label>
          <Input
            id="date_range"
            placeholder="e.g., Jan 2022 - Dec 2023"
            value={formData.date_range}
            onChange={(e) => setFormData(prev => ({ ...prev, date_range: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="project_name">Project Name</Label>
          <Input
            id="project_name"
            placeholder="e.g., Customer Portal Redesign"
            value={formData.project_name}
            onChange={(e) => setFormData(prev => ({ ...prev, project_name: e.target.value }))}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="what_shipped">What I Shipped</Label>
        <Textarea
          id="what_shipped"
          placeholder="Describe what you built, delivered, or achieved..."
          value={formData.what_shipped}
          onChange={(e) => setFormData(prev => ({ ...prev, what_shipped: e.target.value }))}
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="business_goal">Business Goal</Label>
        <Textarea
          id="business_goal"
          placeholder="What business problem did this solve?"
          value={formData.business_goal}
          onChange={(e) => setFormData(prev => ({ ...prev, business_goal: e.target.value }))}
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="outcomes">Outcomes (comma-separated)</Label>
        <Textarea
          id="outcomes"
          placeholder="e.g., Increased revenue by 25%, Reduced churn by 15%"
          value={formData.outcomes.join(", ")}
          onChange={(e) => updateArrayField("outcomes", e.target.value)}
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="tools_used">Tools & Skills (comma-separated)</Label>
        <Input
          id="tools_used"
          placeholder="e.g., Python, SQL, Figma, JIRA"
          value={formData.tools_used.join(", ")}
          onChange={(e) => updateArrayField("tools_used", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="responsibilities">Responsibilities (comma-separated)</Label>
        <Textarea
          id="responsibilities"
          placeholder="e.g., Led cross-functional team, Owned product roadmap"
          value={formData.responsibilities.join(", ")}
          onChange={(e) => updateArrayField("responsibilities", e.target.value)}
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="industries">Industries (comma-separated)</Label>
        <Input
          id="industries"
          placeholder="e.g., SaaS, Healthcare, E-commerce"
          value={formData.industries.join(", ")}
          onChange={(e) => updateArrayField("industries", e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="evidence_weight">Evidence Weight</Label>
          <Select
            value={formData.evidence_weight}
            onValueChange={(v) => setFormData(prev => ({ ...prev, evidence_weight: v }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="high">High - Core accomplishment</SelectItem>
              <SelectItem value="medium">Medium - Solid example</SelectItem>
              <SelectItem value="low">Low - Supporting detail</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="confidence_level">Confidence Level</Label>
          <Select
            value={formData.confidence_level}
            onValueChange={(v) => setFormData(prev => ({ ...prev, confidence_level: v }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="high">High - Can speak to in detail</SelectItem>
              <SelectItem value="medium">Medium - Remember well</SelectItem>
              <SelectItem value="low">Low - Basic recall</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="approved_bullets">Approved Achievement Bullets (comma-separated)</Label>
        <Textarea
          id="approved_bullets"
          placeholder="Pre-written bullet points you want to use verbatim..."
          value={formData.approved_achievement_bullets.join(", ")}
          onChange={(e) => updateArrayField("approved_achievement_bullets", e.target.value)}
          rows={3}
        />
        <p className="text-xs text-muted-foreground">
          These bullets will be used as-is when generating resumes
        </p>
      </div>
    </div>
  )
}
