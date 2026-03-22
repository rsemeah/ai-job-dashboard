"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { mockReadyQueue, mockJobs, mockGeneratedDocuments } from "@/lib/mock-data"
import type { ReadyQueueItem } from "@/lib/types"
import { FitBadge } from "@/components/status-badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Eye, CheckCircle, FileText } from "lucide-react"
import { toast } from "sonner"

export default function ReadyQueuePage() {
  const router = useRouter()
  const [queue, setQueue] = useState<ReadyQueueItem[]>(mockReadyQueue)

  const handleMarkApplied = (item: ReadyQueueItem) => {
    setQueue(prev => prev.filter(q => q.id !== item.id))
    toast.success(`Marked "${item.title}" at ${item.company} as applied`)
  }

  const handleViewJob = (id: string) => {
    router.push(`/jobs/${id}`)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Ready Queue</h1>
        <p className="text-muted-foreground">
          Jobs ready for application with all documents generated
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Ready to Apply</CardTitle>
              <CardDescription>
                {queue.length} job{queue.length !== 1 ? "s" : ""} in queue
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-lg px-3 py-1">
              {queue.length}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Company</TableHead>
                <TableHead className="text-center">Score</TableHead>
                <TableHead>Fit</TableHead>
                <TableHead className="text-center">Docs</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {queue.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    No jobs in the ready queue. Score and approve jobs to add them here.
                  </TableCell>
                </TableRow>
              ) : (
                queue.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Link
                        href={`/jobs/${item.id}`}
                        className="font-medium hover:underline"
                      >
                        {item.title}
                      </Link>
                    </TableCell>
                    <TableCell>{item.company}</TableCell>
                    <TableCell className="text-center">
                      <span className="font-mono font-medium text-lg">
                        {item.score}
                      </span>
                    </TableCell>
                    <TableCell>
                      <FitBadge fit={item.fit} />
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{item.docs_generated_count}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewJob(item.id)}
                        >
                          <Eye className="mr-1 h-4 w-4" />
                          View
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleMarkApplied(item)}
                        >
                          <CheckCircle className="mr-1 h-4 w-4" />
                          Mark Applied
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {queue.length > 0 && (
        <div className="text-sm text-muted-foreground">
          Tip: View each job to review generated documents before marking as applied.
        </div>
      )}
    </div>
  )
}
