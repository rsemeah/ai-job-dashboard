"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import type { Job } from "@/lib/types"
import { updateJobStatus } from "@/lib/actions/jobs"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
  Rocket, 
  Copy, 
  ExternalLink, 
  CheckCircle, 
  MoreHorizontal,
  Loader2,
  Eye,
  XCircle
} from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

interface ReadyJobActionsProps {
  job: Job
}

export function ReadyJobActions({ job }: ReadyJobActionsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isApplying, setIsApplying] = useState(false)

  const handleApply = async () => {
    setIsApplying(true)
    
    // Copy resume to clipboard
    if (job.generated_resume) {
      await navigator.clipboard.writeText(job.generated_resume)
    }
    
    // Open job URL in new tab
    if (job.source_url) {
      window.open(job.source_url, "_blank")
    }
    
    toast.success("Resume copied to clipboard!", {
      description: "Paste it in the application form. Click 'Mark Applied' when done.",
      action: {
        label: "Mark Applied",
        onClick: () => handleMarkApplied(),
      },
    })
    
    setIsApplying(false)
  }

  const handleCopyResume = async () => {
    if (job.generated_resume) {
      await navigator.clipboard.writeText(job.generated_resume)
      toast.success("Resume copied to clipboard!")
    }
  }

  const handleCopyCoverLetter = async () => {
    if (job.generated_cover_letter) {
      await navigator.clipboard.writeText(job.generated_cover_letter)
      toast.success("Cover letter copied to clipboard!")
    }
  }

  const handleMarkApplied = () => {
    startTransition(async () => {
      const result = await updateJobStatus(job.id, "APPLIED")
      if (result.success) {
        toast.success("Marked as applied!")
        router.refresh()
      } else {
        toast.error("Failed to update status")
      }
    })
  }

  const handleArchive = () => {
    startTransition(async () => {
      const result = await updateJobStatus(job.id, "ARCHIVED")
      if (result.success) {
        toast.success("Job archived")
        router.refresh()
      } else {
        toast.error("Failed to archive")
      }
    })
  }

  return (
    <div className="flex items-center gap-2">
      <Button 
        size="sm" 
        onClick={handleApply}
        disabled={isApplying || isPending}
        className="bg-emerald-500 hover:bg-emerald-600"
      >
        {isApplying ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Rocket className="mr-2 h-4 w-4" />
        )}
        Apply
      </Button>
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" disabled={isPending}>
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MoreHorizontal className="h-4 w-4" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/jobs/${job.id}`}>
              <Eye className="mr-2 h-4 w-4" />
              View Details
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleCopyResume}>
            <Copy className="mr-2 h-4 w-4" />
            Copy Resume
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleCopyCoverLetter}>
            <Copy className="mr-2 h-4 w-4" />
            Copy Cover Letter
          </DropdownMenuItem>
          {job.source_url && (
            <DropdownMenuItem onClick={() => window.open(job.source_url!, "_blank")}>
              <ExternalLink className="mr-2 h-4 w-4" />
              Open Job URL
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleMarkApplied}>
            <CheckCircle className="mr-2 h-4 w-4" />
            Mark as Applied
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleArchive} className="text-destructive">
            <XCircle className="mr-2 h-4 w-4" />
            Archive
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
