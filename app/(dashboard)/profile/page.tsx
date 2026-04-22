"use client"

import { useState, useEffect, useTransition } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import {
  User,
  Briefcase,
  GraduationCap,
  Save,
  Plus,
  X,
  Loader2,
  CheckCircle,
  AlertCircle,
  Camera,
  Upload,
  Link2,
  Linkedin,
  Github,
  Globe,
  ExternalLink,
  Trash2,
} from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import Image from "next/image"
import { createClient } from "@/lib/supabase/client"
import { useUser } from "@/components/user-provider"
import { toast } from "sonner"
import { BackButton } from "@/components/back-button"
import { ResumeUpload } from "@/components/resume-upload"
import { PendingChangeCard } from "@/components/pending-change-card"
import {
  migrateLegacyLinks,
  getProfileLinks,
  addProfileLink,
  updateProfileLink,
  removeProfileLink,
  type LinkType,
} from "@/lib/actions/profile-links"

interface Experience {
  title: string
  company: string
  start_date: string
  end_date: string
  description: string
}

interface Education {
  degree: string
  school: string
  year: string
}

// Support multiple links per type
interface ProfileLink {
  id: string
  type: "linkedin" | "github" | "portfolio" | "website" | "other"
  url: string
  label?: string
  isPending?: boolean  // true = not yet persisted to DB
}

interface UserProfile {
  id?: string
  full_name: string
  title: string
  email: string
  phone: string
  location: string
  summary: string
  experience: Experience[]
  education: Education[]
  skills: string[]
  avatar_url: string
  // Legacy single fields (for backward compatibility)
  linkedin_url: string
  github_url: string
  website_url: string
  // New: Multiple links support
  links: ProfileLink[]
  // Raw LinkedIn text for AI enrichment
  linkedin_raw_text: string
}

const emptyProfile: UserProfile = {
  full_name: "",
  title: "",
  email: "",
  phone: "",
  location: "",
  summary: "",
  experience: [],
  education: [],
  skills: [],
  avatar_url: "",
  linkedin_url: "",
  github_url: "",
  website_url: "",
  links: [],
  linkedin_raw_text: "",
}

// Link type configuration
const LINK_TYPES: { value: ProfileLink["type"]; label: string; icon: string; placeholder: string }[] = [
  { value: "linkedin", label: "LinkedIn", icon: "linkedin", placeholder: "https://linkedin.com/in/yourname" },
  { value: "github", label: "GitHub", icon: "github", placeholder: "https://github.com/yourname" },
  { value: "portfolio", label: "Portfolio", icon: "briefcase", placeholder: "https://yourportfolio.com" },
  { value: "website", label: "Website", icon: "globe", placeholder: "https://yoursite.com" },
  { value: "other", label: "Other", icon: "link", placeholder: "https://..." },
]

function getInitials(name: string): string {
  if (!name) return "U"
  const parts = name.trim().split(" ")
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return name.substring(0, 2).toUpperCase()
}

export default function ProfilePage() {
  const { refreshProfile } = useUser()
  const [profile, setProfile] = useState<UserProfile>(emptyProfile)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [newSkill, setNewSkill] = useState("")
  const [profileStatus, setProfileStatus] = useState<"incomplete" | "complete">("incomplete")
  const [pendingChanges, setPendingChanges] = useState<Array<{
    id: string
    summary: string
    source: string
    proposed_changes: Record<string, { old_value: unknown; new_value: unknown }>
    created_at: string
  }>>([])
  const [loadingPendingChanges, setLoadingPendingChanges] = useState(false)

  // Load profile and pending changes on mount
  useEffect(() => {
    loadProfile()
    loadPendingChanges()
  }, [])

  const loadPendingChanges = async () => {
    setLoadingPendingChanges(true)
    try {
      const res = await fetch("/api/profile/pending-changes")
      if (res.ok) {
        const data = await res.json()
        setPendingChanges(data.changes || [])
      }
    } catch (error) {
      console.error("Error loading pending changes:", error)
    } finally {
      setLoadingPendingChanges(false)
    }
  }

  const handlePendingChangeAction = async (changeId: string, action: "approve" | "reject") => {
    const res = await fetch("/api/profile/pending-changes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ change_id: changeId, action }),
    })
    
    if (res.ok) {
      toast.success(action === "approve" ? "Changes applied" : "Changes rejected")
      // Reload profile if approved
      if (action === "approve") {
        await loadProfile()
      }
      // Remove from pending list
      setPendingChanges(prev => prev.filter(c => c.id !== changeId))
    } else {
      toast.error("Failed to process change")
    }
  }

  // Check profile completeness
  useEffect(() => {
    const isComplete = !!(
      profile.full_name &&
      profile.summary &&
      profile.skills.length > 0 &&
      Array.isArray(profile.experience) && profile.experience.length > 0
    )
    setProfileStatus(isComplete ? "complete" : "incomplete")
  }, [profile])

  const loadProfile = async () => {
    try {
      // Fetch profile and links in parallel
      const [profileRes, linksResult] = await Promise.all([
        fetch("/api/profile"),
        getProfileLinks(),
      ])
      
      if (profileRes.ok) {
        const data = await profileRes.json()
        
        // Map server links to local format
        const serverLinks: ProfileLink[] = (linksResult.links || []).map(l => ({
          id: l.id,
          type: l.link_type as ProfileLink["type"],
          url: l.url,
          label: l.label || "",
          isPending: false,
        }))
        
        if (data) {
          // Normalize education entries: coerce any parser-shaped entries
          // ({date_range, field, honors}) to the UI shape ({degree, school, year})
          // and deduplicate by degree+school to prevent double entries from
          // prior incorrect writes.
          const rawEducation: Array<Record<string, unknown>> = Array.isArray(data.education) ? data.education : []
          const seenEdu = new Set<string>()
          const normalizedEducation: Education[] = []
          for (const edu of rawEducation) {
            const degree = String(edu.degree || "")
            const school = String(edu.school || "")
            // Coerce year: prefer 'year', fall back to extracting a 4-digit year
            // from 'date_range' (e.g. "2015 – 2019" → "2019")
            let year = String(edu.year || "")
            if (!year && edu.date_range) {
              const match = String(edu.date_range).match(/\d{4}/)
              if (match) year = match[0]
            }
            const key = `${degree.toLowerCase()}|${school.toLowerCase()}`
            if (seenEdu.has(key)) continue
            seenEdu.add(key)
            normalizedEducation.push({ degree, school, year })
          }

          setProfile({
            ...emptyProfile,
            id: data.id,
            full_name: data.full_name || "",
            title: data.title || "",
            email: data.email || "",
            phone: data.phone || "",
            location: data.location || "",
            summary: data.summary || "",
            experience: Array.isArray(data.experience) ? data.experience : [],
            education: normalizedEducation,
            skills: data.skills || [],
            avatar_url: data.avatar_url || "",
            linkedin_url: data.linkedin_url || "",
            github_url: data.github_url || "",
            website_url: data.website_url || "",
            links: serverLinks,
            linkedin_raw_text: data.linkedin_raw_text || "",
          })
        }
        
        // Auto-migrate legacy links — if migration produces new rows, reload
        if (data?.linkedin_url || data?.github_url || data?.website_url) {
          migrateLegacyLinks().then(result => {
            if (result.migratedCount > 0) {
              getProfileLinks().then(freshLinks => {
                if (freshLinks.success) {
                  setProfile(prev => ({
                    ...prev,
                    links: freshLinks.links.map(l => ({
                      id: l.id,
                      type: l.link_type as ProfileLink["type"],
                      url: l.url,
                      label: l.label || "",
                      isPending: false,
                    })),
                  }))
                }
              })
            }
          }).catch(() => { /* fire-and-forget */ })
        }
      }
    } catch (error) {
      console.error("Error loading profile:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const saveProfile = async () => {
    setIsSaving(true)
    try {
      // First, persist any pending links that haven't been saved yet
      const pendingLinks = profile.links.filter(
        link => (link.isPending || link.id.startsWith("temp-")) && link.url.trim()
      )
      
      if (pendingLinks.length > 0) {
        const linkPromises = pendingLinks.map(async (link) => {
          const result = await addProfileLink({
            link_type: link.type as LinkType,
            url: link.url,
            label: link.label,
          })
          if (result.success && result.link) {
            return { oldId: link.id, newId: result.link.id }
          }
          return null
        })
        
        const results = await Promise.all(linkPromises)
        
        // Update local state with new IDs
        setProfile(prev => ({
          ...prev,
          links: prev.links.map(link => {
            const updated = results.find(r => r?.oldId === link.id)
            if (updated) {
              return { ...link, id: updated.newId, isPending: false }
            }
            return link
          }),
        }))
      }
      
      // Then save the rest of the profile (excluding links - they're handled separately)
      const { links, ...profileWithoutLinks } = profile
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileWithoutLinks),
      })
      
      if (res.ok) {
        toast.success("Profile saved successfully!")
        setHasChanges(false)
        await refreshProfile() // Update the user context
      } else {
        toast.error("Failed to save profile")
      }
    } catch (error) {
      toast.error("Failed to save profile")
    } finally {
      setIsSaving(false)
    }
  }

  const updateField = (field: keyof UserProfile, value: string) => {
    setProfile(prev => ({ ...prev, [field]: value }))
    setHasChanges(true)
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file")
      return
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be less than 2MB")
      return
    }

    setIsUploadingAvatar(true)
    try {
      const supabase = createClient()
      
      // Get user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error("Please log in to upload an avatar")
        return
      }

      // Create unique filename
      const fileExt = file.name.split(".").pop()
      const fileName = `${user.id}-${Date.now()}.${fileExt}`
      const filePath = `avatars/${fileName}`

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true })

      if (uploadError) {
        // If bucket doesn't exist, provide a helpful error
        if (uploadError.message.includes("not found")) {
          toast.error("Avatar storage not configured. Please contact support.")
        } else {
          throw uploadError
        }
        return
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath)

      // Update profile with new avatar URL
      setProfile(prev => ({ ...prev, avatar_url: publicUrl }))
      setHasChanges(true)
      toast.success("Avatar uploaded! Don't forget to save your profile.")
    } catch (error) {
      console.error("Error uploading avatar:", error)
      toast.error("Failed to upload avatar")
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  const addSkill = () => {
    if (newSkill.trim() && !profile.skills.includes(newSkill.trim())) {
      setProfile(prev => ({
        ...prev,
        skills: [...prev.skills, newSkill.trim()],
      }))
      setNewSkill("")
      setHasChanges(true)
    }
  }

  const removeSkill = (skillToRemove: string) => {
    setProfile(prev => ({
      ...prev,
      skills: prev.skills.filter(s => s !== skillToRemove),
    }))
    setHasChanges(true)
  }

  const addExperience = () => {
    setProfile(prev => ({
      ...prev,
      experience: [
        ...prev.experience,
        { title: "", company: "", start_date: "", end_date: "", description: "" },
      ],
    }))
    setHasChanges(true)
  }

  const updateExperience = (index: number, field: keyof Experience, value: string) => {
    setProfile(prev => ({
      ...prev,
      experience: prev.experience.map((exp, i) =>
        i === index ? { ...exp, [field]: value } : exp
      ),
    }))
    setHasChanges(true)
  }

  const removeExperience = (index: number) => {
    setProfile(prev => ({
      ...prev,
      experience: prev.experience.filter((_, i) => i !== index),
    }))
    setHasChanges(true)
  }

  const addEducation = () => {
    setProfile(prev => ({
      ...prev,
      education: [...prev.education, { degree: "", school: "", year: "" }],
    }))
    setHasChanges(true)
  }

  const updateEducation = (index: number, field: keyof Education, value: string) => {
    setProfile(prev => ({
      ...prev,
      education: prev.education.map((edu, i) =>
        i === index ? { ...edu, [field]: value } : edu
      ),
    }))
    setHasChanges(true)
  }

  const removeEducation = (index: number) => {
    setProfile(prev => ({
      ...prev,
      education: prev.education.filter((_, i) => i !== index),
    }))
    setHasChanges(true)
  }

  // Link management functions — DB-backed via server actions
  const addLink = (type: ProfileLink["type"] = "other") => {
    setProfile(prev => ({
      ...prev,
      links: [...prev.links, { id: `temp-${crypto.randomUUID()}`, type, url: "", label: "", isPending: true }],
    }))
    setHasChanges(true) // Enable Save button when adding new link
  }

  const updateLink = (id: string, field: keyof ProfileLink, value: string) => {
    setProfile(prev => ({
      ...prev,
      links: prev.links.map(link =>
        link.id === id ? { ...link, [field]: value } : link
      ),
    }))
    setHasChanges(true) // Enable Save button when editing link
    // Type change on a persisted link: update DB immediately
    if (field === "type") {
      const link = profile.links.find(l => l.id === id)
      if (link && !link.isPending && !id.startsWith("temp-")) {
        updateProfileLink({ id, link_type: value as LinkType }).catch(() => {
          toast.error("Failed to update link type")
        })
      }
    }
  }

  const persistLink = async (id: string) => {
    const link = profile.links.find(l => l.id === id)
    if (!link || !link.url.trim()) return
    if (link.isPending || id.startsWith("temp-")) {
      const result = await addProfileLink({ link_type: link.type as LinkType, url: link.url, label: link.label })
      if (result.success && result.link) {
        setProfile(prev => ({
          ...prev,
          links: prev.links.map(l =>
            l.id === id ? { ...l, id: result.link!.id, isPending: false } : l
          ),
        }))
        toast.success("Link saved")
      } else {
        toast.error(result.error || "Failed to save link")
      }
    } else {
      const result = await updateProfileLink({ id, url: link.url, label: link.label, link_type: link.type as LinkType })
      if (result.success) {
        toast.success("Link updated")
      } else {
        toast.error(result.error || "Failed to update link")
      }
    }
  }

  const removeLink = async (id: string) => {
    const linkToRemove = profile.links.find(l => l.id === id)
    if (!linkToRemove) return
    setProfile(prev => ({ ...prev, links: prev.links.filter(l => l.id !== id) }))
    if (linkToRemove.isPending || id.startsWith("temp-")) return
    const result = await removeProfileLink(id)
    if (!result.success) {
      setProfile(prev => ({ ...prev, links: [...prev.links, linkToRemove] }))
      toast.error(result.error || "Failed to remove link")
    }
  }

  // Helper to get icon for link type
  const getLinkIcon = (type: ProfileLink["type"]) => {
    switch (type) {
      case "linkedin": return <Linkedin className="h-4 w-4" />
      case "github": return <Github className="h-4 w-4" />
      case "portfolio": return <Briefcase className="h-4 w-4" />
      case "website": return <Globe className="h-4 w-4" />
      default: return <Link2 className="h-4 w-4" />
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <BackButton fallbackHref="/" />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <p className="text-xs font-medium tracking-[0.2em] uppercase text-muted-foreground">
            Settings
          </p>
          <h1 className="text-3xl font-serif font-medium tracking-tight">Your Profile</h1>
          <p className="text-muted-foreground">
            Your profile powers AI-generated resumes and cover letters.
          </p>
        </div>
        <div className="flex items-center gap-4">
          {profileStatus === "complete" ? (
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
              <CheckCircle className="mr-1.5 h-3 w-3" />
              Complete
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
              <AlertCircle className="mr-1.5 h-3 w-3" />
              Incomplete
            </Badge>
          )}
          <Button onClick={saveProfile} disabled={!hasChanges || isSaving} className="h-11 px-5">
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Profile
          </Button>
        </div>
      </div>

      {/* Profile Status Alert */}
      {profileStatus === "incomplete" && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="flex gap-4 pt-6">
            <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-600 dark:text-amber-400">Complete your profile</p>
              <p className="text-sm text-muted-foreground">
                Add your name, summary, at least one skill, and one work experience to enable AI-generated resumes and cover letters.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending Changes Section */}
      {pendingChanges.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Pending Profile Changes
            </CardTitle>
            <CardDescription>
              Review and approve suggested updates to your profile
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {pendingChanges.map((change) => (
              <PendingChangeCard
                key={change.id}
                change={change}
                onAction={handlePendingChangeAction}
              />
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6">
        {/* Source Resume Upload */}
        <ResumeUpload 
          onUploadComplete={() => {
            // Reload profile to get any auto-populated fields from the parsed resume
            loadProfile()
          }}
        />

        {/* Basic Info */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Basic Information</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Avatar Upload */}
            <div className="flex items-center gap-6">
              <div className="relative">
                {profile.avatar_url ? (
                  <Image
                    src={profile.avatar_url}
                    alt={profile.full_name || "Profile"}
                    width={80}
                    height={80}
                    className="h-20 w-20 rounded-full object-cover border-2 border-border"
                  />
                ) : (
                  <div className="h-20 w-20 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-2xl font-semibold border-2 border-border">
                    {getInitials(profile.full_name)}
                  </div>
                )}
                <label
                  htmlFor="avatar-upload"
                  className="absolute -bottom-1 -right-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors"
                >
                  {isUploadingAvatar ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                </label>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                  disabled={isUploadingAvatar}
                />
              </div>
              <div className="space-y-1">
                <p className="font-medium">Profile Photo</p>
                <p className="text-sm text-muted-foreground">
                  Click the camera icon to upload a photo. Max 2MB.
                </p>
              </div>
            </div>

            <Separator />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name *</Label>
                <Input
                  id="full_name"
                  value={profile.full_name}
                  onChange={(e) => updateField("full_name", e.target.value)}
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">Professional Title</Label>
                <Input
                  id="title"
                  value={profile.title}
                  onChange={(e) => updateField("title", e.target.value)}
                  placeholder="Senior Product Manager"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={profile.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  placeholder="john@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={profile.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={profile.location}
                  onChange={(e) => updateField("location", e.target.value)}
                  placeholder="San Francisco, CA"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="summary">Professional Summary *</Label>
              <Textarea
                id="summary"
                value={profile.summary}
                onChange={(e) => updateField("summary", e.target.value)}
                placeholder="Experienced software engineer with 5+ years building scalable web applications..."
                className="min-h-[100px]"
              />
            </div>
          </CardContent>
        </Card>

        {/* Skills */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Skills *</CardTitle>
              <span className="text-sm text-muted-foreground">{profile.skills.length} skills</span>
            </div>
            <CardDescription>
              Add your technical and professional skills
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                placeholder="e.g., React, Python, Project Management"
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
              />
              <Button onClick={addSkill} variant="secondary">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {profile.skills.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {profile.skills.map((skill) => (
                  <Badge key={skill} variant="secondary" className="px-3 py-1">
                    {skill}
                    <button
                      onClick={() => removeSkill(skill)}
                      className="ml-2 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Experience */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-muted-foreground" />
                <CardTitle>Work Experience *</CardTitle>
              </div>
              <Button onClick={addExperience} variant="outline" size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Experience
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {(!Array.isArray(profile.experience) || profile.experience.length === 0) ? (
              <div className="text-center py-8 text-muted-foreground">
                <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No work experience added yet</p>
                <Button onClick={addExperience} variant="link" className="mt-2">
                  Add your first position
                </Button>
              </div>
            ) : (
              (Array.isArray(profile.experience) ? profile.experience : []).map((exp, index) => (
                <div key={index} className="space-y-4 p-4 border rounded-lg relative">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-8 w-8"
                    onClick={() => removeExperience(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Job Title</Label>
                      <Input
                        value={exp.title}
                        onChange={(e) => updateExperience(index, "title", e.target.value)}
                        placeholder="Senior Software Engineer"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Company</Label>
                      <Input
                        value={exp.company}
                        onChange={(e) => updateExperience(index, "company", e.target.value)}
                        placeholder="Tech Company Inc."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Start Date</Label>
                      <Input
                        value={exp.start_date}
                        onChange={(e) => updateExperience(index, "start_date", e.target.value)}
                        placeholder="Jan 2020"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>End Date</Label>
                      <Input
                        value={exp.end_date}
                        onChange={(e) => updateExperience(index, "end_date", e.target.value)}
                        placeholder="Present"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Description & Achievements</Label>
                    <Textarea
                      value={exp.description}
                      onChange={(e) => updateExperience(index, "description", e.target.value)}
                      placeholder="Led development of key features, reduced load time by 50%..."
                      className="min-h-[80px]"
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Education */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-muted-foreground" />
                <CardTitle>Education</CardTitle>
              </div>
              <Button onClick={addEducation} variant="outline" size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Education
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {(!Array.isArray(profile.education) || profile.education.length === 0) ? (
              <div className="text-center py-8 text-muted-foreground">
                <GraduationCap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No education added yet</p>
                <Button onClick={addEducation} variant="link" className="mt-2">
                  Add your education
                </Button>
              </div>
            ) : (
              (Array.isArray(profile.education) ? profile.education : []).map((edu, index) => (
                <div key={index} className="flex gap-4 p-4 border rounded-lg relative">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-8 w-8"
                    onClick={() => removeEducation(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <div className="grid gap-4 sm:grid-cols-3 flex-1">
                    <div className="space-y-2">
                      <Label>Degree</Label>
                      <Input
                        value={edu.degree}
                        onChange={(e) => updateEducation(index, "degree", e.target.value)}
                        placeholder="B.S. Computer Science"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>School</Label>
                      <Input
                        value={edu.school}
                        onChange={(e) => updateEducation(index, "school", e.target.value)}
                        placeholder="University Name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Year</Label>
                      <Input
                        value={edu.year}
                        onChange={(e) => updateEducation(index, "year", e.target.value)}
                        placeholder="2018"
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        {/* Professional Links - Multiple links support */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Link2 className="h-5 w-5 text-muted-foreground" />
                <CardTitle>Professional Links</CardTitle>
              </div>
              <Select onValueChange={(value) => addLink(value as ProfileLink["type"])}>
                <SelectTrigger className="w-[140px]">
                  <Plus className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Add Link" />
                </SelectTrigger>
                <SelectContent>
                  {LINK_TYPES.map(lt => (
                    <SelectItem key={lt.value} value={lt.value}>
                      {lt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <CardDescription>
              Add multiple links to LinkedIn profiles, GitHub repos, portfolios, and websites.
              The AI Coach uses these to better understand your background.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(!Array.isArray(profile.links) || profile.links.length === 0) ? (
              <div className="text-center py-6 text-muted-foreground">
                <Link2 className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No links added yet</p>
                <p className="text-xs mt-1">Add your LinkedIn, GitHub, portfolio, or other professional links</p>
              </div>
            ) : (
              (Array.isArray(profile.links) ? profile.links : []).map((link) => {
                const linkConfig = LINK_TYPES.find(lt => lt.value === link.type) || LINK_TYPES[4]
                const isUnsaved = link.isPending || link.id.startsWith("temp-")
                return (
                  <div key={link.id} className={`flex items-center gap-3 p-3 border rounded-lg ${isUnsaved ? "bg-amber-50/50 border-amber-200" : "bg-muted/30"}`}>
                    <div className="flex items-center justify-center h-9 w-9 rounded-md bg-background border">
                      {getLinkIcon(link.type)}
                    </div>
                    <div className="flex-1 grid gap-2 sm:grid-cols-[1fr_2fr]">
                      <Select
                        value={link.type}
                        onValueChange={(value) => {
                          updateLink(link.id, "type", value)
                          // Auto-save type change for existing links
                          if (!isUnsaved) {
                            persistLink(link.id)
                          }
                        }}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LINK_TYPES.map(lt => (
                            <SelectItem key={lt.value} value={lt.value}>
                              {lt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="url"
                        value={link.url}
                        onChange={(e) => updateLink(link.id, "url", e.target.value)}
                        onBlur={() => persistLink(link.id)}
                        placeholder={linkConfig?.placeholder || "https://..."}
                        className={`h-9 ${isUnsaved ? "italic" : ""}`}
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      {/* Unsaved indicator */}
                      {isUnsaved && (
                        <span className="text-xs text-amber-600 italic mr-1">unsaved</span>
                      )}
                      {link.url && !isUnsaved && (
                        <a 
                          href={link.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => removeLink(link.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )
              })
            )}

            <Separator className="my-2" />

            {/* LinkedIn raw text for AI enrichment */}
            <div className="space-y-2">
              <Label htmlFor="linkedin_raw_text" className="flex items-center gap-2">
                <Linkedin className="h-4 w-4 text-muted-foreground" />
                LinkedIn Profile Text
              </Label>
              <p className="text-xs text-muted-foreground">
                Paste the full text of your LinkedIn profile. The AI uses this to enrich your evidence library and scoring context. Must be at least 200 characters if provided.
              </p>
              <Textarea
                id="linkedin_raw_text"
                value={profile.linkedin_raw_text}
                onChange={(e) => updateField("linkedin_raw_text", e.target.value)}
                placeholder="Paste your LinkedIn About section, experience, and skills here..."
                className="min-h-[140px] font-mono text-xs"
              />
              {profile.linkedin_raw_text.trim().length > 0 && profile.linkedin_raw_text.trim().length < 200 && (
                <p className="text-xs text-destructive">
                  Must be at least 200 characters ({profile.linkedin_raw_text.trim().length}/200)
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Floating Save Button */}
      {hasChanges && (
        <div className="fixed bottom-6 right-6 bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 z-50">
          <span className="text-sm">Unsaved changes</span>
          <Button size="sm" variant="secondary" onClick={saveProfile} disabled={isSaving}>
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
          </Button>
        </div>
      )}
    </div>
  )
}
