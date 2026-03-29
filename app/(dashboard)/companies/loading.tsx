import { PageHeaderSkeleton, StatsCardsSkeleton, CardGridSkeleton } from "@/components/loading-skeleton"

export default function CompaniesLoading() {
  return (
    <div className="space-y-8 max-w-6xl">
      <PageHeaderSkeleton />
      <StatsCardsSkeleton count={3} />
      <CardGridSkeleton count={6} />
    </div>
  )
}
