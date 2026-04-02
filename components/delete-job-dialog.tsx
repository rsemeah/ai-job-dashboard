"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { deleteJob } from "@/lib/actions/jobs"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Trash2, Loader2 } from "lucide-react"

interface DeleteJobDialogProps {
  jobId: string
  jobTitle: string
  company: string
  variant?: "button" | "icon" | "menu-item"
  onDeleted?: () => void
  redirectTo?: string
}

export function DeleteJobDialog({
  jobId,
  jobTitle,
  company,
  variant = "button",
  onDeleted,
  redirectTo,
}: DeleteJobDialogProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteJob(jobId)
      
      if (result.success) {
        toast.success("Job deleted", {
          description: `${jobTitle} at ${company} has been removed from your pipeline.`,
        })
        setOpen(false)
        
        if (onDeleted) {
          onDeleted()
        }
        
        if (redirectTo) {
          router.push(redirectTo)
        } else {
          router.refresh()
        }
      } else {
        toast.error("Failed to delete job", {
          description: result.error || "Please try again.",
        })
      }
    })
  }

  const TriggerButton = () => {
    switch (variant) {
      case "icon":
        return (
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Delete job</span>
          </Button>
        )
      case "menu-item":
        return (
          <button className="flex w-full items-center gap-2 px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10 rounded-sm">
            <Trash2 className="h-4 w-4" />
            Delete Job
          </button>
        )
      default:
        return (
          <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        )
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <TriggerButton />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this job?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              You&apos;re about to remove <strong>{jobTitle}</strong> at <strong>{company}</strong> from your pipeline.
            </p>
            <p className="text-sm">
              This will remove the job from all views including Companies, Applications, and Ready Queue. 
              Any generated materials (resume, cover letter) will also be hidden.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Job
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
