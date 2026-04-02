"use client"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useState, Suspense } from "react"
import { Loader2, Mail } from "lucide-react"
import dynamic from "next/dynamic"

// Email/password inputs are loaded client-only to prevent hydration mismatch
// caused by password manager extensions (LastPass, 1Password) injecting DOM elements
const EmailInput = dynamic(
  () => Promise.resolve(({ value, onChange, disabled }: { value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; disabled: boolean }) => (
    <Input
      id="email"
      type="email"
      placeholder="you@example.com"
      required
      value={value}
      onChange={onChange}
      disabled={disabled}
    />
  )),
  { ssr: false, loading: () => <div className="h-10 w-full bg-muted rounded animate-pulse" /> }
)

const PasswordInput = dynamic(
  () => Promise.resolve(({ value, onChange, disabled }: { value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; disabled: boolean }) => (
    <Input
      id="password"
      type="password"
      required
      value={value}
      onChange={onChange}
      disabled={disabled}
    />
  )),
  { ssr: false, loading: () => <div className="h-10 w-full bg-muted rounded animate-pulse" /> }
)

function LoginForm() {
  // Use empty strings as defaults to prevent null/undefined warnings
  const [email, setEmail] = useState<string>("")
  const [password, setPassword] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isMagicLinkSent, setIsMagicLinkSent] = useState(false)
  const [authMode, setAuthMode] = useState<"password" | "magic">("password")
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get("redirect") || "/"

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const baseUrl = process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || window.location.origin
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${baseUrl}/auth/callback?redirect=${encodeURIComponent(redirectTo)}`,
        },
      })
      if (error) throw error
      setIsMagicLinkSent(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send magic link")
    } finally {
      setIsLoading(false)
    }
  }

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (error) throw error
      
      router.push(redirectTo)
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Invalid email or password")
    } finally {
      setIsLoading(false)
    }
  }

  if (isMagicLinkSent) {
    return (
      <Card className="border-0 shadow-none lg:border lg:shadow-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
            <Mail className="h-6 w-6 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-serif">Check your email</CardTitle>
          <CardDescription className="text-base">
            We sent a magic link to <strong>{email}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            Click the link in your email to sign in. The link expires in 1 hour.
          </p>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              setIsMagicLinkSent(false)
              setEmail("")
            }}
          >
            Use a different email
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-0 shadow-none lg:border lg:shadow-sm">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-serif">Welcome back</CardTitle>
        <CardDescription>Sign in to your HireWire account</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Email Auth - Inputs use dynamic import with ssr:false to prevent hydration mismatch from password manager extensions */}
        <form onSubmit={authMode === "magic" ? handleMagicLink : handlePasswordLogin}>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <EmailInput
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>

            {authMode === "password" && (
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <PasswordInput
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            )}

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full h-11 font-semibold" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {authMode === "magic" ? "Sending link..." : "Signing in..."}
                </>
              ) : authMode === "magic" ? (
                "Send magic link"
              ) : (
                "Log in"
              )}
            </Button>
          </div>
        </form>

        <button
          type="button"
          className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => setAuthMode(authMode === "magic" ? "password" : "magic")}
        >
          {authMode === "magic" ? "Log in with password" : "Log in with magic link"}
        </button>

        <p className="text-center text-sm text-muted-foreground">
          New to HireWire?{" "}
          <Link href="/signup" className="font-semibold text-primary hover:underline">
            Create an account
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <Card className="border-0 shadow-none lg:border lg:shadow-sm">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    }>
      <LoginForm />
    </Suspense>
  )
}
