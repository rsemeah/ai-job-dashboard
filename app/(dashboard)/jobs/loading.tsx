import { PageHeaderSkeleton, TableSkeleton } from "@/components/loading-skeleton"

export default function JobsLoading() {
  return (
    <div className="space-y-8 max-w-6xl">
      <PageHeaderSkeleton />
      <TableSkeleton rows={8} />
    </div>
  )
}
