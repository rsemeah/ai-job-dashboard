"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { mockWorkflowLogs, mockJobs } from "@/lib/mock-data"
import type { WorkflowStatus } from "@/lib/types"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  AlertTriangle,
} from "lucide-react"
import { cn } from "@/lib/utils"

const statusConfig: Record<WorkflowStatus, { icon: typeof CheckCircle; color: string; bgColor: string }> = {
  SUCCESS: { 
    icon: CheckCircle, 
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10"
  },
  ERROR: { 
    icon: XCircle, 
    color: "text-red-500",
    bgColor: "bg-red-500/10"
  },
  PENDING: { 
    icon: Clock, 
    color: "text-amber-500",
    bgColor: "bg-amber-500/10"
  },
  RUNNING: { 
    icon: Loader2, 
    color: "text-blue-500",
    bgColor: "bg-blue-500/10"
  },
}

function formatDateTime(dateString: string) {
  return new Date(dateString).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  })
}

export default function LogsPage() {
  const [showErrorsOnly, setShowErrorsOnly] = useState(false)

  const filteredLogs = useMemo(() => {
    const logs = showErrorsOnly
      ? mockWorkflowLogs.filter(log => log.status === "ERROR")
      : mockWorkflowLogs

    return logs.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  }, [showErrorsOnly])

  const errorCount = mockWorkflowLogs.filter(log => log.status === "ERROR").length
  const successCount = mockWorkflowLogs.filter(log => log.status === "SUCCESS").length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Workflow Logs</h1>
        <p className="text-muted-foreground">
          Monitor workflow executions and debug errors
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Logs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockWorkflowLogs.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              Success
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-500">{successCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              Errors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{errorCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Success Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {((successCount / mockWorkflowLogs.length) * 100).toFixed(1)}%
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Execution Logs</CardTitle>
              <CardDescription>
                {filteredLogs.length} log{filteredLogs.length !== 1 ? "s" : ""} 
                {showErrorsOnly && " (errors only)"}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="errors-only"
                checked={showErrorsOnly}
                onCheckedChange={setShowErrorsOnly}
              />
              <Label htmlFor="errors-only" className="flex items-center gap-2 cursor-pointer">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                Errors only
              </Label>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Status</TableHead>
                <TableHead>Workflow</TableHead>
                <TableHead>Step</TableHead>
                <TableHead>Job</TableHead>
                <TableHead>Error Message</TableHead>
                <TableHead>Timestamp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    {showErrorsOnly 
                      ? "No errors found. All workflows completed successfully!"
                      : "No workflow logs found."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log) => {
                  const config = statusConfig[log.status]
                  const Icon = config.icon
                  const job = mockJobs.find(j => j.id === log.job_id)

                  return (
                    <TableRow key={log.id}>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "border-transparent font-medium",
                            config.bgColor,
                            config.color
                          )}
                        >
                          <Icon className={cn(
                            "mr-1 h-3 w-3",
                            log.status === "RUNNING" && "animate-spin"
                          )} />
                          {log.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <code className="text-sm bg-muted px-1.5 py-0.5 rounded">
                          {log.workflow_name}
                        </code>
                      </TableCell>
                      <TableCell>
                        <code className="text-sm bg-muted px-1.5 py-0.5 rounded">
                          {log.step_name}
                        </code>
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/jobs/${log.job_id}`}
                          className="text-sm hover:underline"
                        >
                          {job?.title || log.job_id}
                        </Link>
                      </TableCell>
                      <TableCell className="max-w-[300px]">
                        {log.error_message ? (
                          <ScrollArea className="max-h-[60px]">
                            <code className="text-xs text-red-500 whitespace-pre-wrap">
                              {log.error_message}
                            </code>
                          </ScrollArea>
                        ) : (
                          <span className="text-muted-foreground">--</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDateTime(log.created_at)}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
