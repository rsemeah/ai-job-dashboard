import { CoachChat } from "@/components/coach-chat"

export const metadata = {
  title: "Coach | HireWire",
  description: "Your AI-powered career coach",
}

export default function CoachPage() {
  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight">Career Coach</h1>
        <p className="text-sm text-muted-foreground mt-1">
          AI-powered advice grounded in your actual experience and pipeline.
        </p>
      </div>
      <div className="flex-1 border border-border rounded-lg overflow-hidden bg-card">
        <CoachChat className="h-full" />
      </div>
    </div>
  )
}
