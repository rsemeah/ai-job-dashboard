"use client"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
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
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirectTo)}`,
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

  const handleGoogleLogin = async () => {
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirectTo)}`,
        },
      })
      if (error) throw error
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to sign in with Google")
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
        {/* Google Sign In */}
        <Button
          variant="outline"
          className="w-full h-11 gap-3"
          onClick={handleGoogleLogin}
          disabled={isLoading}
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continue with Google
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <Separator />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">Or</span>
          </div>
        </div>

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
