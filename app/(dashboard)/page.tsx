"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { mockJobs } from "@/lib/mock-data"
import type { JobStatus, JobSource } from "@/lib/types"
import {
  Briefcase,
  Sparkles,
  CheckCircle2,
  Send,
  MessageSquare,
  Archive,
} from "lucide-react"
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
  LineChart,
  Line,
} from "recharts"

const statusCounts = mockJobs.reduce((acc, job) => {
  acc[job.status] = (acc[job.status] || 0) + 1
  return acc
}, {} as Record<JobStatus, number>)

const sourceCounts = mockJobs.reduce((acc, job) => {
  acc[job.source] = (acc[job.source] || 0) + 1
  return acc
}, {} as Record<JobSource, number>)

const stats = [
  {
    name: "Total Jobs",
    value: mockJobs.length,
    icon: Briefcase,
    color: "text-foreground",
  },
  {
    name: "NEW",
    value: statusCounts.NEW || 0,
    icon: Sparkles,
    color: "text-blue-500",
  },
  {
    name: "SCORED",
    value: statusCounts.SCORED || 0,
    icon: CheckCircle2,
    color: "text-amber-500",
  },
  {
    name: "READY_TO_APPLY",
    value: statusCounts.READY_TO_APPLY || 0,
    icon: CheckCircle2,
    color: "text-emerald-500",
  },
  {
    name: "APPLIED",
    value: statusCounts.APPLIED || 0,
    icon: Send,
    color: "text-indigo-500",
  },
  {
    name: "INTERVIEW",
    value: statusCounts.INTERVIEW || 0,
    icon: MessageSquare,
    color: "text-pink-500",
  },
]

const pipelineData = [
  { name: "NEW", value: statusCounts.NEW || 0 },
  { name: "SCORED", value: statusCounts.SCORED || 0 },
  { name: "READY", value: statusCounts.READY_TO_APPLY || 0 },
  { name: "APPLIED", value: statusCounts.APPLIED || 0 },
]

const sourceData = Object.entries(sourceCounts).map(([source, count]) => ({
  name: source,
  value: count,
}))

const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))"]

// Mock data for score over time
const scoreOverTimeData = [
  { date: "Jan 5", avgScore: 72 },
  { date: "Jan 8", avgScore: 78 },
  { date: "Jan 10", avgScore: 85 },
  { date: "Jan 13", avgScore: 68 },
  { date: "Jan 14", avgScore: 75 },
  { date: "Jan 15", avgScore: 82 },
  { date: "Jan 16", avgScore: 0 },
]

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your job application pipeline
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {stats.map((stat) => (
          <Card key={stat.name}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.name.replace(/_/g, " ")}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Pipeline Funnel */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Pipeline Funnel</CardTitle>
            <CardDescription>Jobs by pipeline stage</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pipelineData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" className="text-xs fill-muted-foreground" />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={60}
                    className="text-xs fill-muted-foreground"
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--popover))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "var(--radius)"
                    }}
                    labelStyle={{ color: "hsl(var(--popover-foreground))" }}
                  />
                  <Bar 
                    dataKey="value" 
                    fill="hsl(var(--chart-1))"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Jobs by Source */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Jobs by Source</CardTitle>
            <CardDescription>Distribution across job boards</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sourceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={false}
                  >
                    {sourceData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--popover))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "var(--radius)"
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Avg Score Over Time */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Avg Score Over Time</CardTitle>
            <CardDescription>Job fit scores trend</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={scoreOverTimeData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis 
                    dataKey="date" 
                    className="text-xs fill-muted-foreground"
                  />
                  <YAxis 
                    domain={[0, 100]}
                    className="text-xs fill-muted-foreground"
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--popover))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "var(--radius)"
                    }}
                    labelStyle={{ color: "hsl(var(--popover-foreground))" }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="avgScore" 
                    stroke="hsl(var(--chart-2))"
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--chart-2))" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
