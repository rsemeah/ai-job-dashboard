export default function HealthPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-green-600">HireWire is Running</h1>
        <p className="text-muted-foreground mt-2">Build successful</p>
        <p className="text-xs text-muted-foreground mt-4">
          {new Date().toISOString()}
        </p>
      </div>
    </div>
  )
}
