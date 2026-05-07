"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Loader2, Save, X, Plus, Upload } from "lucide-react"
import { useRouter } from "next/navigation"

interface ProfileData {
  full_name: string | null
  email: string | null
  phone: string | null
  location: string | null
  summary: string | null
  skills: string[] | null
  linkedin_url: string | null
  portfolio_url: string | null
}

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<ProfileData>({
    full_name: "",
    email: "",
    phone: "",
    location: "",
    summary: "",
    skills: [],
    linkedin_url: "",
    portfolio_url: "",
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [skillInput, setSkillInput] = useState("")

  const fetchProfile = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push("/login"); return }

    const { data } = await supabase
      .from("user_profile")
      .select("full_name, email, phone, location, summary, skills, linkedin_url, portfolio_url")
      .eq("user_id", user.id)
      .single()

    if (data) {
      setProfile({
        full_name: data.full_name || "",
        email: data.email || "",
        phone: data.phone || "",
        location: data.location || "",
        summary: data.summary || "",
        skills: data.skills || [],
        linkedin_url: data.linkedin_url || "",
        portfolio_url: data.portfolio_url || "",
      })
    }
    setLoading(false)
  }, [router])

  useEffect(() => { fetchProfile() }, [fetchProfile])

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      const { error: upsertError } = await supabase
        .from("user_profile")
        .upsert({
          user_id: user.id,
          full_name: profile.full_name,
          email: profile.email,
          phone: profile.phone,
          location: profile.location,
          summary: profile.summary,
          skills: profile.skills,
          linkedin_url: profile.linkedin_url,
          portfolio_url: profile.portfolio_url,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" })

      if (upsertError) throw upsertError
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  const addSkill = () => {
    const trimmed = skillInput.trim()
    if (!trimmed) return
    if (profile.skills?.includes(trimmed)) { setSkillInput(""); return }
    setProfile(p => ({ ...p, skills: [...(p.skills || []), trimmed] }))
    setSkillInput("")
  }

  const removeSkill = (skill: string) => {
    setProfile(p => ({ ...p, skills: (p.skills || []).filter(s => s !== skill) }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Your professional identity. Used across all analyses and document generation.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/onboarding")}
          className="shrink-0"
        >
          <Upload className="h-3.5 w-3.5 mr-1.5" />
          Upload resume
        </Button>
      </div>

      <div className="border border-border rounded-lg p-6 bg-card space-y-6">
        {/* Basic info */}
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-mono mb-4">Basic Info</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="full_name">Full name</Label>
              <Input
                id="full_name"
                value={profile.full_name || ""}
                onChange={e => setProfile(p => ({ ...p, full_name: e.target.value }))}
                placeholder="Your full name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={profile.location || ""}
                onChange={e => setProfile(p => ({ ...p, location: e.target.value }))}
                placeholder="City, State"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={profile.email || ""}
                onChange={e => setProfile(p => ({ ...p, email: e.target.value }))}
                placeholder="you@example.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={profile.phone || ""}
                onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))}
                placeholder="+1 (555) 000-0000"
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Summary */}
        <div className="space-y-1.5">
          <Label htmlFor="summary">Professional summary</Label>
          <Textarea
            id="summary"
            value={profile.summary || ""}
            onChange={e => setProfile(p => ({ ...p, summary: e.target.value }))}
            placeholder="2-3 sentences describing your professional background and key strengths..."
            rows={4}
            className="resize-none"
          />
        </div>

        <Separator />

        {/* Skills */}
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-mono mb-4">Skills</p>
          <div className="flex flex-wrap gap-2 mb-3 min-h-[32px]">
            {(profile.skills || []).map(skill => (
              <Badge key={skill} variant="secondary" className="gap-1 pr-1">
                {skill}
                <button
                  onClick={() => removeSkill(skill)}
                  className="hover:text-foreground text-muted-foreground ml-0.5"
                  aria-label={`Remove ${skill}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {(profile.skills || []).length === 0 && (
              <p className="text-sm text-muted-foreground">No skills added yet.</p>
            )}
          </div>
          <div className="flex gap-2">
            <Input
              value={skillInput}
              onChange={e => setSkillInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addSkill() } }}
              placeholder="Add a skill and press Enter"
              className="max-w-xs"
            />
            <Button variant="outline" size="sm" onClick={addSkill} disabled={!skillInput.trim()}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Separator />

        {/* Links */}
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-mono mb-4">Links</p>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="linkedin_url">LinkedIn</Label>
              <Input
                id="linkedin_url"
                value={profile.linkedin_url || ""}
                onChange={e => setProfile(p => ({ ...p, linkedin_url: e.target.value }))}
                placeholder="https://linkedin.com/in/yourname"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="portfolio_url">Portfolio / Website</Label>
              <Input
                id="portfolio_url"
                value={profile.portfolio_url || ""}
                onChange={e => setProfile(p => ({ ...p, portfolio_url: e.target.value }))}
                placeholder="https://yoursite.com"
              />
            </div>
          </div>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      <div className="flex items-center justify-end gap-3">
        {saved && (
          <p className="text-sm text-green-600 font-medium">Saved</p>
        )}
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-[#7B1212] hover:bg-[#6a0f0f] text-white"
        >
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          {saving ? "Saving..." : "Save profile"}
        </Button>
      </div>
    </div>
  )
}
