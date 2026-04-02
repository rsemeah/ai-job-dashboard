"use client"

import { JobUrlInput } from "@/components/job-input"
import { UsageLimitWarning } from "@/components/premium-gate"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function AddJobPage() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b border-border bg-card/50">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <Link 
            href="/jobs" 
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Jobs
          </Link>
          <div className="space-y-1">
            <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Add Job
            </p>
            <h1 className="text-2xl font-serif font-medium text-foreground">
              Analyze a New Opportunity
            </h1>
            <p className="text-muted-foreground">
              Paste a job URL to analyze fit, generate tailored materials, and track your application.
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Usage limit warning */}
        <UsageLimitWarning action="add_job" className="mb-6" />
        
        <JobUrlInput />
      </div>
    </div>
  )
}
