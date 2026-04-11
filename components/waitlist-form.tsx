"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, CheckCircle2, Sparkles } from "lucide-react"
import { trackEvent } from "@/components/posthog-provider"

interface WaitlistFormProps {
  source?: string
  className?: string
  compact?: boolean
}

export function WaitlistForm({ source = "login_page", className = "", compact = false }: WaitlistFormProps) {
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [message, setMessage] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email.trim()) return
    
    setStatus("loading")
    
    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source }),
      })
      
      const data = await response.json()
      
      if (response.ok && data.success) {
        setStatus("success")
        setMessage(data.message)
        trackEvent.custom("waitlist_joined", { source, email_domain: email.split("@")[1] })
      } else {
        setStatus("error")
        setMessage(data.error || "Something went wrong")
      }
    } catch {
      setStatus("error")
      setMessage("Failed to connect. Please try again.")
    }
  }

  if (status === "success") {
    return (
      <div className={`flex items-center gap-2 text-green-600 ${className}`}>
        <CheckCircle2 className="h-5 w-5" />
        <span className="text-sm font-medium">{message}</span>
      </div>
    )
  }

  if (compact) {
    return (
      <form onSubmit={handleSubmit} className={`flex gap-2 ${className}`}>
        <Input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={status === "loading"}
          className="flex-1"
        />
        <Button type="submit" disabled={status === "loading" || !email.trim()}>
          {status === "loading" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Join"
          )}
        </Button>
      </form>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Sparkles className="h-4 w-4 text-primary" />
        <span>Join the waitlist for early access</span>
      </div>
      
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
        <Input
          type="email"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={status === "loading"}
          className="flex-1"
        />
        <Button 
          type="submit" 
          disabled={status === "loading" || !email.trim()}
          className="sm:w-auto w-full"
        >
          {status === "loading" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Joining...
            </>
          ) : (
            "Get Early Access"
          )}
        </Button>
      </form>
      
      {status === "error" && (
        <p className="text-sm text-destructive">{message}</p>
      )}
      
      <p className="text-xs text-muted-foreground">
        No spam. We&apos;ll only email you when HireWire is ready.
      </p>
    </div>
  )
}
