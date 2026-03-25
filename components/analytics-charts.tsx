"use client"

import type { Job, JobStatus, JobFit } from "@/lib/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts"

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
]

interface AnalyticsChartsProps {
  jobs: Job[]
}

export function AnalyticsCharts({ jobs }: AnalyticsChartsProps) {
  // Status distribution (using canonical statuses)
  const statusCounts = jobs.reduce((acc, job) => {
    const status = job.status || "submitted"
    acc[status] = (acc[status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const statusData = Object.entries(statusCounts).map(([status, count]) => ({
    name: status.replace(/_/g, " "),
    value: count,
  }))

  // Fit distribution
  const fitCounts = jobs.reduce((acc, job) => {
    const fit = job.fit || "UNSCORED"
    acc[fit] = (acc[fit] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const fitData = Object.entries(fitCounts).map(([fit, count]) => ({
    name: fit,
    value: count,
  }))

  // Source distribution
  const sourceCounts = jobs.reduce((acc, job) => {
    const source = job.source || "Unknown"
    acc[source] = (acc[source] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const sourceData = Object.entries(sourceCounts).map(([source, count]) => ({
    name: source,
    value: count,
  }))

  // Score distribution
  const scoreRanges = [
    { range: "0-50", min: 0, max: 50, count: 0 },
    { range: "51-70", min: 51, max: 70, count: 0 },
    { range: "71-85", min: 71, max: 85, count: 0 },
    { range: "86-100", min: 86, max: 100, count: 0 },
  ]

  jobs.forEach(job => {
    if (job.score !== null && job.score !== undefined) {
      const range = scoreRanges.find(r => job.score! >= r.min && job.score! <= r.max)
      if (range) range.count++
    }
  })

  const scoreDistributionData = scoreRanges.map(r => ({
    name: r.range,
    count: r.count,
  }))

  // Conversion metrics (using canonical statuses)
  const totalJobs = jobs.length
  const scoredJobs = jobs.filter(j => j.score !== null).length
  const appliedJobs = jobs.filter(j => 
    ["applied", "interviewing", "offered"].includes(j.status || "")
  ).length
  const interviewJobs = jobs.filter(j => 
    ["interviewing", "offered"].includes(j.status || "")
  ).length
  const offerJobs = jobs.filter(j => j.status === "offered").length

  const conversionData = [
    { stage: "Total", value: totalJobs },
    { stage: "Scored", value: scoredJobs },
    { stage: "Applied", value: appliedJobs },
    { stage: "Interview", value: interviewJobs },
    { stage: "Offer", value: offerJobs },
  ]

  // Calculate average score
  const scoredJobsList = jobs.filter(j => j.score !== null && j.score !== undefined)
  const avgScore = scoredJobsList.length > 0 
    ? Math.round(scoredJobsList.reduce((sum, j) => sum + (j.score || 0), 0) / scoredJobsList.length)
    : 0

  return (
    <>
      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Jobs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalJobs}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Applied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{appliedJobs}</div>
            <p className="text-xs text-muted-foreground">
              {totalJobs > 0 ? ((appliedJobs / totalJobs) * 100).toFixed(0) : 0}% of total
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Interviews
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{interviewJobs}</div>
            <p className="text-xs text-muted-foreground">
              {appliedJobs > 0 ? ((interviewJobs / appliedJobs) * 100).toFixed(0) : 0}% response rate
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Offers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{offerJobs}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgScore || "--"}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Conversion Funnel */}
        <Card>
          <CardHeader>
            <CardTitle>Conversion Funnel</CardTitle>
            <CardDescription>Jobs through each stage</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={conversionData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="stage" className="text-xs fill-muted-foreground" />
                  <YAxis className="text-xs fill-muted-foreground" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "var(--radius)",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    fill="hsl(var(--chart-1))"
                    fillOpacity={0.3}
                    stroke="hsl(var(--chart-1))"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Status Distribution</CardTitle>
            <CardDescription>Jobs by current status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {statusData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                      labelLine={false}
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--popover))",
                        borderColor: "hsl(var(--border))",
                        borderRadius: "var(--radius)",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Score Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Score Distribution</CardTitle>
            <CardDescription>Jobs by score range</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={scoreDistributionData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" className="text-xs fill-muted-foreground" />
                  <YAxis className="text-xs fill-muted-foreground" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "var(--radius)",
                    }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Fit Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Fit Distribution</CardTitle>
            <CardDescription>Jobs by fit level</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={fitData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" className="text-xs fill-muted-foreground" />
                  <YAxis dataKey="name" type="category" width={80} className="text-xs fill-muted-foreground" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "var(--radius)",
                    }}
                  />
                  <Bar dataKey="value" fill="hsl(var(--chart-3))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Source Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Job Sources</CardTitle>
            <CardDescription>Where jobs came from</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              {sourceData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sourceData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {sourceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--popover))",
                        borderColor: "hsl(var(--border))",
                        borderRadius: "var(--radius)",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
