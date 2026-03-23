"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { Job } from "@/lib/types"
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
} from "recharts"

interface DashboardChartsProps {
  stats: {
    total: number
    byStatus: Record<string, number>
    byFit: Record<string, number>
    bySource: Record<string, number>
    lastJobCreated?: string | null
    hasWorkflowOutputs?: boolean
  }
  jobs: Job[]
}

const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))"]

export function DashboardCharts({ stats, jobs }: DashboardChartsProps) {
  const pipelineData = [
    { name: "NEW", value: stats.byStatus["NEW"] || 0 },
    { name: "SCORED", value: stats.byStatus["SCORED"] || 0 },
    { name: "READY", value: stats.byStatus["READY_TO_APPLY"] || 0 },
    { name: "APPLIED", value: stats.byStatus["APPLIED"] || 0 },
  ]

  const sourceData = Object.entries(stats.bySource).map(([source, count]) => ({
    name: source,
    value: count,
  }))

  const fitData = [
    { name: "High", value: stats.byFit["HIGH"] || 0, fill: "hsl(var(--chart-1))" },
    { name: "Medium", value: stats.byFit["MEDIUM"] || 0, fill: "hsl(var(--chart-2))" },
    { name: "Low", value: stats.byFit["LOW"] || 0, fill: "hsl(var(--chart-3))" },
    { name: "Unscored", value: stats.byFit["UNSCORED"] || 0, fill: "hsl(var(--chart-4))" },
  ].filter(d => d.value > 0)

  return (
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
            {sourceData.length > 0 ? (
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
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                No data available
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Fit Distribution */}
      <Card className="col-span-1">
        <CardHeader>
          <CardTitle>Fit Distribution</CardTitle>
          <CardDescription>Jobs by fit level</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            {fitData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={fitData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis 
                    dataKey="name" 
                    className="text-xs fill-muted-foreground"
                  />
                  <YAxis className="text-xs fill-muted-foreground" />
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
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
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
  )
}
