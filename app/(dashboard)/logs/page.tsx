"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { mockWorkflowLogs, mockJobs } from "@/lib/mock-data"
import type { LogStatus, WorkflowName } from "@/lib/types"
import { WORKFLOW_LABELS, LOG_STATUS_CONFIG, cn } from "@/lib/utils"
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
  Minus,
  AlertTriangle,
} from "lucide-react"

const statusIcons: Record<LogStatus, typeof CheckCircle> = {
  SUCCESS: CheckCircle,
  ERROR: XCircle,
  SKIPPED: Minus,
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
      ? mockWorkflowLogs.filter((log) => log.status === "ERROR")
      : mockWorkflowLogs
    return [...logs].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
  }, [showErrorsOnly])

  const errorCount = mockWorkflowLogs.filter((log) => log.status === "ERROR").length
  const successCount = mockWorkflowLogs.filter((log) => log.status === "SUCCESS").length
  const skippedCount = mockWorkflowLogs.filter((log) => log.status === "SKIPPED").length

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
              {mockWorkflowLogs.length > 0
                ? ((successCount / mockWorkflowLogs.length) * 100).toFixed(1)
                : "0"}
              %
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
              <Label
                htmlFor="errors-only"
                className="flex items-center gap-2 cursor-pointer"
              >
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
                <TableHead className="w-[110px]">Status</TableHead>
                <TableHead>Workflow</TableHead>
                <TableHead>Step</TableHead>
                <TableHead>Job</TableHead>
                <TableHead>Error / Output</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Timestamp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="h-24 text-center text-muted-foreground"
                  >
                    {showErrorsOnly
                      ? "No errors found. All workflows completed successfully!"
                      : "No workflow logs found."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log) => {
                  const cfg = LOG_STATUS_CONFIG[log.status]
                  const Icon = statusIcons[log.status]
                  const job = log.job_id
                    ? mockJobs.find((j) => j.id === log.job_id)
                    : null
                  const workflowLabel =
                    WORKFLOW_LABELS[log.workflow_name as WorkflowName] ??
                    log.workflow_name

                  return (
                    <TableRow key={log.id}>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            "border-transparent font-medium gap-1",
                            cfg.className,
                          )}
                        >
                          <Icon className="h-3 w-3" />
                          {log.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <code className="text-sm bg-muted px-1.5 py-0.5 rounded">
                          {workflowLabel}
                        </code>
                      </TableCell>
                      <TableCell>
                        <code className="text-sm bg-muted px-1.5 py-0.5 rounded">
                          {log.step_name}
                        </code>
                      </TableCell>
                      <TableCell>
                        {log.job_id ? (
                          <Link
                            href={`/jobs/${log.job_id}`}
                            className="text-sm hover:underline"
                          >
                            {job?.title ?? log.job_id}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[300px]">
                        {log.error_message ? (
                          <ScrollArea className="max-h-[60px]">
                            <code className="text-xs text-red-500 whitespace-pre-wrap">
                              {log.error_message}
                            </code>
                          </ScrollArea>
                        ) : log.output_snapshot ? (
                          <code className="text-xs text-muted-foreground">
                            {JSON.stringify(log.output_snapshot)}
                          </code>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm tabular-nums">
                        {log.duration_ms != null ? `${log.duration_ms}ms` : "—"}
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

      {/* Jobot fragility notice */}
      {mockWorkflowLogs.some(
        (l) => l.status === "ERROR" && l.step_name === "fetch_jobot",
      ) && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          <strong>Jobot ingestion errors detected.</strong> Jobot has no official
          API — the connector is fragile and may break without notice. Consider
          disabling it in Settings until a stable alternative is available.
        </div>
      )}
    </div>
  )
}
