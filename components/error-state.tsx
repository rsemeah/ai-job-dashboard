"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertTriangle, RefreshCw, XCircle, WifiOff, Clock } from "lucide-react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

type ErrorVariant = "error" | "warning" | "timeout" | "offline"

interface ErrorStateProps {
  variant?: ErrorVariant
  title?: string
  message?: string
  details?: string
  onRetry?: () => void
  showRetry?: boolean
  className?: string
}

const variantConfig: Record<ErrorVariant, {
  icon: typeof AlertTriangle
  iconClass: string
  bgClass: string
  borderClass: string
}> = {
  error: {
    icon: XCircle,
    iconClass: "text-red-500",
    bgClass: "bg-red-50",
    borderClass: "border-red-200",
  },
  warning: {
    icon: AlertTriangle,
    iconClass: "text-amber-500",
    bgClass: "bg-amber-50",
    borderClass: "border-amber-200",
  },
  timeout: {
    icon: Clock,
    iconClass: "text-amber-500",
    bgClass: "bg-amber-50",
    borderClass: "border-amber-200",
  },
  offline: {
    icon: WifiOff,
    iconClass: "text-gray-500",
    bgClass: "bg-gray-50",
    borderClass: "border-gray-200",
  },
}

export function ErrorState({ 
  variant = "warning",
  title = "Unable to load data", 
  message = "Something went wrong. Please try again.",
  details,
  onRetry,
  showRetry = true,
  className,
}: ErrorStateProps) {
  const router = useRouter()
  const config = variantConfig[variant]
  const Icon = config.icon

  const handleRetry = () => {
    if (onRetry) {
      onRetry()
    } else {
      router.refresh()
    }
  }

  return (
    <Card className={cn(
      "border",
      config.borderClass,
      className
    )}>
      <CardContent className={cn(
        "flex flex-col items-center justify-center py-12 text-center",
        config.bgClass
      )}>
        <div className="rounded-full bg-white/50 p-4 mb-4">
          <Icon className={cn("h-7 w-7", config.iconClass)} />
        </div>
        
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        
        <p className="text-sm text-muted-foreground max-w-md mb-2">
          {message}
        </p>
        
        {details && (
          <p className="text-xs text-muted-foreground/70 max-w-md mb-4 font-mono bg-white/50 px-3 py-2 rounded">
            {details}
          </p>
        )}
        
        {showRetry && (
          <Button variant="outline" size="sm" onClick={handleRetry} className="mt-4">
            <RefreshCw className="mr-2 h-3 w-3" />
            Try Again
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

// Inline error for forms/inputs
export function InlineError({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-red-600 mt-1">
      <XCircle className="h-3.5 w-3.5 flex-shrink-0" />
      <span>{message}</span>
    </div>
  )
}
