"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CardWireAccent, CTAWireUnderline, BarbedWireLine, EmptyStateWire, HeaderTexture } from "@/components/barbed-wire"
import { useUser } from "@/components/user-provider"
import type { Job } from "@/lib/types"
import {
  Search,
  Zap,
  FileText,
  Star,
  ChevronRight,
  Target,
  Radio,
} from "lucide-react"

interface DashboardContentProps {
  stats: {
    total: number
    byStatus: Record<string, number>
    byFit: Record<string, number>
    bySource: Record<string, number>
  }
  jobs: Job[]
}

// Company logo component with fallbacks
function CompanyLogo({ company, className = "" }: { company: string; className?: string }) {
  const initial = company?.charAt(0)?.toUpperCase() || "?"
  
  // Known company styles
  const companyStyles: Record<string, { bg: string; text: string; icon?: string }> = {
    "amazon": { bg: "bg-black", text: "text-white", icon: "a" },
    "google": { bg: "bg-white border", text: "text-gray-700", icon: "G" },
    "meta": { bg: "bg-blue-600", text: "text-white", icon: "M" },
    "apple": { bg: "bg-black", text: "text-white", icon: "" },
    "microsoft": { bg: "bg-[#00a4ef]", text: "text-white", icon: "M" },
    "stripe": { bg: "bg-[#635bff]", text: "text-white", icon: "S" },
    "openai": { bg: "bg-black", text: "text-white", icon: "O" },
    "vercel": { bg: "bg-black", text: "text-white", icon: "V" },
    "redlantern": { bg: "bg-red-600", text: "text-white", icon: "R" },
    "datacore": { bg: "bg-indigo-600", text: "text-white", icon: "D" },
    "sleektech": { bg: "bg-slate-800", text: "text-white", icon: "S" },
    "hitech": { bg: "bg-emerald-600", text: "text-white", icon: "H" },
  }
  
  const key = company?.toLowerCase().replace(/\s+/g, "") || ""
  const style = companyStyles[key] || { bg: "bg-gray-100", text: "text-gray-700" }
  
  return (
    <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-semibold text-sm ${style.bg} ${style.text} ${className}`}>
      {style.icon !== undefined ? style.icon : initial}
    </div>
  )
}

// Fit score badge with gradient ring
function FitScoreBadge({ score }: { score: number | null | undefined }) {
  const displayScore = score ?? 0
  const isHigh = displayScore >= 80
  const isMedium = displayScore >= 60 && displayScore < 80
  
  return (
    <div className="relative">
      <svg className="w-10 h-10" viewBox="0 0 40 40">
        {/* Background circle */}
        <circle
          cx="20"
          cy="20"
          r="17"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          className="text-gray-200"
        />
        {/* Progress circle */}
        <circle
          cx="20"
          cy="20"
          r="17"
          fill="none"
          stroke={isHigh ? "#22c55e" : isMedium ? "#f59e0b" : "#94a3b8"}
          strokeWidth="2.5"
          strokeDasharray={`${displayScore * 1.07} 107`}
          strokeLinecap="round"
          transform="rotate(-90 20 20)"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">
        {displayScore}%
      </span>
    </div>
  )
}

// Quality breakdown bar
function QualityBar({ label, value, icon: Icon, max = 100 }: { label: string; value: number; icon?: React.ElementType; max?: number }) {
  const percentage = Math.min((value / max) * 100, 100)
  
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground" />}
          <span className="text-muted-foreground">{label}</span>
        </div>
        <span className="font-semibold">{value}%</span>
      </div>
      <div className="quality-bar">
        <div className="quality-bar-fill" style={{ width: `${percentage}%` }} />
      </div>
    </div>
  )
}

export function DashboardContent({ stats, jobs }: DashboardContentProps) {
  const router = useRouter()
  const { profile } = useUser()
  const [jobUrl, setJobUrl] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [activeTab, setActiveTab] = useState("jobs")

  const firstName = profile?.full_name?.split(" ")[0] || "there"

  // Get recent jobs (last 5)
  const recentJobs = jobs.slice(0, 5)
  
  // Get jobs with documents
  const jobsWithDocs = jobs.filter(j => j.generated_resume || j.generated_cover_letter).slice(0, 4)
  
  // Calculate high fit count
  const highFitCount = stats.byFit["HIGH"] || 0
  
  // Best match score
  const bestMatch = jobs.length > 0 ? Math.max(...jobs.map(j => j.score || 0)) : 0

  const handleAnalyze = async () => {
    if (!jobUrl.trim()) return
    setIsAnalyzing(true)
    
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: jobUrl }),
      })
      
      const data = await response.json()
      if (data.success && data.job_id) {
        router.push(`/jobs/${data.job_id}`)
      }
    } catch (error) {
      console.error("Analysis failed:", error)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const tabs = [
    { id: "jobs", label: "Jobs" },
    { id: "documents", label: "Documents" },
    { id: "metrics", label: "Metrics" },
    { id: "prep", label: "Prep Kit" },
  ]

  return (
    <div className="min-h-screen">
      {/* Welcome Header with subtle texture */}
      <div className="relative px-6 pt-6 pb-4">
        <HeaderTexture />
        <div className="relative">
          <h1 className="text-2xl font-semibold text-foreground">
            Welcome back, {firstName}.
          </h1>
          <p className="text-muted-foreground mt-1">
            {recentJobs.length > 0 
              ? `${recentJobs[0]?.company || "A company"} just posted a new listing — let's break it down.`
              : "Ready to analyze your next opportunity."
            }
          </p>
        </div>
      </div>

      {/* Analyze CTA - DOMINANT */}
      <div className="px-6 pb-4">
        <div className="flex gap-3">
          <div className="relative flex-1 max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Paste job URL to analyze..."
              value={jobUrl}
              onChange={(e) => setJobUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
              className="pl-10 h-12 bg-card border-border/50 shadow-sm text-sm"
            />
          </div>
          <Button 
            onClick={handleAnalyze}
            disabled={isAnalyzing || !jobUrl.trim()}
            className="hw-btn-primary h-12 px-8 rounded-lg group relative text-sm font-semibold"
          >
            <Zap className="h-4 w-4 mr-2" />
            Analyze Job Post
            <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-0.5 transition-transform" />
            <CTAWireUnderline />
          </Button>
        </div>
      </div>

      {/* Header Divider - Barbed Wire */}
      <div className="px-6 pb-2">
        <BarbedWireLine intensity="light" />
      </div>

      {/* Tab Row */}
      <div className="px-6 border-b border-border">
        <div className="flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 text-sm font-medium transition-colors relative ${
                activeTab === tab.id 
                  ? "text-foreground tab-active" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid */}
      <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Activity */}
          <div className="hw-card p-5 relative overflow-hidden">
            <CardWireAccent />
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-foreground">Recent Activity</h2>
              <Link href="/jobs" className="text-xs text-primary hover:underline flex items-center gap-1 font-medium">
                View more <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            
            {recentJobs.length === 0 ? (
              <div className="text-center py-10">
                <EmptyStateWire />
                <Radio className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
                <p className="font-semibold text-foreground">No signals yet.</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Drop a job link above and we&apos;ll break it down instantly.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentJobs.map((job) => (
                  <Link
                    key={job.id}
                    href={`/jobs/${job.id}`}
                    className="flex items-center gap-4 p-3 rounded-lg hover:bg-accent/60 transition-all group hover:shadow-sm"
                  >
                    <CompanyLogo company={job.company || ""} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-foreground truncate group-hover:text-primary transition-colors">
                        {job.title || "Untitled Position"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {job.company || "Unknown Company"}
                      </p>
                      <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                        {job.fit === "HIGH" ? "Strong fit for your profile" : "Analyzing fit..."}
                      </p>
                    </div>
                    <FitScoreBadge score={job.score} />
                  </Link>
                ))}
              </div>
            )}
            
            {recentJobs.length > 0 && (
              <div className="mt-4 pt-3 border-t border-border/50">
                <Link 
                  href="/jobs" 
                  className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                >
                  View more <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            )}
          </div>

          {/* Updated Documents */}
          <div className="hw-card p-5 relative overflow-hidden">
            <CardWireAccent />
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-foreground">Updated Documents</h2>
              <Link href="/documents" className="text-xs text-primary hover:underline flex items-center gap-1 font-medium">
                Edit in DocHub <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            
            {jobsWithDocs.length === 0 ? (
              <div className="text-center py-8">
                <EmptyStateWire />
                <FileText className="h-9 w-9 mx-auto mb-3 text-muted-foreground/40" />
                <p className="font-semibold text-foreground">No documents yet.</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Analyze a job to generate tailored materials.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {jobsWithDocs.map((job) => (
                  <Link
                    key={job.id}
                    href={`/jobs/${job.id}`}
                    className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-accent/60 transition-all group"
                  >
                    <div className="w-9 h-9 rounded bg-primary/10 flex items-center justify-center">
                      <FileText className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                        {profile?.full_name?.replace(" ", "_") || "Resume"}_{job.company?.replace(/\s+/g, "_") || "Company"}.pdf
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Generated {job.generation_timestamp ? "just now" : "recently"}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="hw-card p-5 relative overflow-hidden">
            <CardWireAccent />
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-foreground">Pipeline Summary</h2>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground">{stats.total}</div>
                <div className="text-xs text-muted-foreground">Total Jobs</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{highFitCount}</div>
                <div className="text-xs text-muted-foreground">High Fit</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.byStatus["READY"] || 0}</div>
                <div className="text-xs text-muted-foreground">Ready</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{stats.byStatus["APPLIED"] || 0}</div>
                <div className="text-xs text-muted-foreground">Applied</div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-6">
          {/* Best Match */}
          <div className="hw-card p-5 relative overflow-hidden">
            <CardWireAccent />
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold text-foreground">Best Match</h2>
              {bestMatch >= 80 && (
                <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded font-medium">
                  Strong Fit
                </span>
              )}
              {bestMatch >= 60 && bestMatch < 80 && (
                <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded font-medium">
                  Good Fit
                </span>
              )}
              {bestMatch > 0 && bestMatch < 60 && (
                <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded font-medium">
                  Review Needed
                </span>
              )}
            </div>
            
            {recentJobs.length === 0 ? (
              <div className="text-center py-8">
                <Target className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
                <p className="font-semibold text-foreground">No jobs analyzed yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Submit a job URL to see your fit score.
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-center py-4">
                  <div className="relative">
                    <svg className="w-28 h-28" viewBox="0 0 100 100">
                      <circle
                        cx="50"
                        cy="50"
                        r="42"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="6"
                        className="text-muted/50"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="42"
                        fill="none"
                        stroke="hsl(var(--primary))"
                        strokeWidth="6"
                        strokeDasharray={`${bestMatch * 2.64} 264`}
                        strokeLinecap="round"
                        transform="rotate(-90 50 50)"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-bold">{bestMatch}%</span>
                      <span className="text-[10px] text-muted-foreground">Fit Score</span>
                    </div>
                  </div>
                </div>

                {recentJobs[0] && (
                  <div className="text-center mb-4">
                    <p className="text-sm font-medium">{recentJobs[0].title}</p>
                    <p className="text-xs text-muted-foreground">{recentJobs[0].company}</p>
                  </div>
                )}

                <div className="mt-4 pt-3 border-t border-border/50">
                  <Link 
                    href={recentJobs[0]?.id ? `/jobs/${recentJobs[0].id}` : "/jobs"}
                    className="text-sm text-primary hover:underline flex items-center gap-1 font-medium"
                  >
                    View Details <ChevronRight className="h-3 w-3" />
                  </Link>
                </div>
              </>
            )}
          </div>

          {/* Job Matches */}
          <div className="hw-card p-5 relative overflow-hidden">
            <CardWireAccent />
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-foreground">Job Matches</h2>
            </div>
            
            {recentJobs.slice(0, 3).length === 0 ? (
              <div className="text-center py-6">
                <EmptyStateWire />
                <p className="text-sm text-muted-foreground">No matches yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentJobs.slice(0, 3).map((job, idx) => (
                  <Link
                    key={job.id}
                    href={`/jobs/${job.id}`}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/60 transition-all group"
                  >
                    <CompanyLogo company={job.company || ""} className="w-8 h-8 text-xs" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{job.title || "Position"}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {job.company} {job.score ? `• ${job.score}% fit` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-3 w-3 ${
                            star <= Math.ceil((job.score || 0) / 20)
                              ? "text-amber-400 fill-amber-400"
                              : "text-gray-200"
                          }`}
                        />
                      ))}
                    </div>
                  </Link>
                ))}
                <div className="pt-2">
                  <Link 
                    href="/jobs"
                    className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                  >
                    View more matches <ChevronRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Strip */}
      <div className="px-6 pb-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Updated Documents (compact) */}
        <div className="hw-card p-5 relative overflow-hidden">
          <CardWireAccent />
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <h2 className="font-semibold text-foreground">Updated Documents</h2>
          </div>
          <div className="space-y-2">
            {jobsWithDocs.slice(0, 2).map((job) => (
              <div key={job.id} className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="truncate">{profile?.full_name?.replace(" ", "_")}_Resume.pdf</span>
                <span className="text-xs text-muted-foreground ml-auto">Just now</span>
              </div>
            ))}
            {jobsWithDocs.length === 0 && (
              <p className="text-sm text-muted-foreground">No documents yet</p>
            )}
          </div>
        </div>

        {/* Quality Breakdown */}
        <div className="hw-card p-5 relative overflow-hidden">
          <CardWireAccent />
          <h2 className="font-semibold text-foreground mb-4">Quality Breakdown</h2>
          <div className="space-y-3">
            <QualityBar label="Job Match" value={75} icon={Target} />
            <QualityBar label="Skills Fit" value={85} icon={Sparkles} />
          </div>
        </div>

        {/* Interview Readiness */}
        <div className="hw-card p-5 relative overflow-hidden">
          <CardWireAccent />
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground">Interview Readiness</h2>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <Target className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Congruence Scores</p>
                <p className="font-semibold">85%</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Story Ready</p>
                <p className="font-semibold">83%</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
