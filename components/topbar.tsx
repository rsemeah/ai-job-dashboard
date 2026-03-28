"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { ThemeToggle } from "@/components/theme-toggle"
import { useUser } from "@/components/user-provider"
import {
  Search,
  Bell,
  Filter,
  User,
  Settings,
  LogOut,
  Briefcase,
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"

const notifications = [
  {
    id: 1,
    type: "success",
    title: "Application Submitted",
    description: "Stripe - Senior Engineer application was submitted",
    time: "5 minutes ago",
    read: false,
  },
  {
    id: 2,
    type: "info",
    title: "New High-Fit Job",
    description: "OpenAI - Staff ML Engineer scored 92",
    time: "1 hour ago",
    read: false,
  },
  {
    id: 3,
    type: "warning",
    title: "Workflow Error",
    description: "Scoring failed for job #1847",
    time: "2 hours ago",
    read: true,
  },
  {
    id: 4,
    type: "info",
    title: "Interview Scheduled",
    description: "Vercel - Interview on March 25th",
    time: "3 hours ago",
    read: true,
  },
]

function getInitials(name: string | null | undefined, email: string | null | undefined): string {
  if (name) {
    const parts = name.trim().split(" ")
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }
  if (email) {
    return email.substring(0, 2).toUpperCase()
  }
  return "U"
}

export function Topbar() {
  const router = useRouter()
  const { user, profile, isLoading, signOut } = useUser()
  const [searchQuery, setSearchQuery] = useState("")
  const [searchOpen, setSearchOpen] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)

  const unreadCount = notifications.filter((n) => !n.read).length

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/jobs?search=${encodeURIComponent(searchQuery.trim())}`)
      setSearchOpen(false)
      setSearchQuery("")
    }
  }

  const handleSignOut = async () => {
    setIsSigningOut(true)
    try {
      await signOut()
    } catch {
      setIsSigningOut(false)
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "success":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case "warning":
        return <AlertCircle className="h-4 w-4 text-amber-500" />
      default:
        return <Briefcase className="h-4 w-4 text-blue-500" />
    }
  }

  const displayName = profile?.full_name || user?.email?.split("@")[0] || "User"
  const displayEmail = user?.email || ""
  const initials = getInitials(profile?.full_name, user?.email)

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      
      {/* Mobile Logo - visible only when sidebar is collapsed on mobile */}
      <Link href="/" className="flex items-center gap-2 md:hidden">
        <Image
          src="/images/hirewire-logo.png"
          alt="HireWire"
          width={100}
          height={36}
          className="object-contain"
          style={{ width: 'auto', height: 'auto' }}
        />
      </Link>

      {/* Global Search */}
      <Popover open={searchOpen} onOpenChange={setSearchOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full max-w-xs justify-start gap-2 text-muted-foreground sm:max-w-sm"
          >
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">Search jobs, companies...</span>
            <span className="sm:hidden">Search...</span>
            <kbd className="ml-auto hidden rounded bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground sm:inline-block">
              /
            </kbd>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <form onSubmit={handleSearch} className="p-3">
            <div className="flex gap-2">
              <Input
                placeholder="Search jobs, companies, keywords..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
                autoFocus
              />
              <Button type="submit" size="sm">
                Search
              </Button>
            </div>
          </form>
          <Separator />
          <div className="p-2">
            <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
              Quick Filters
            </p>
            <button
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
              onClick={() => {
                router.push("/jobs?fit=HIGH")
                setSearchOpen(false)
              }}
            >
              <span className="h-2 w-2 rounded-full bg-green-500" />
              High Fit Jobs
            </button>
            <button
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
              onClick={() => {
                router.push("/ready-queue")
                setSearchOpen(false)
              }}
            >
              <Clock className="h-3 w-3 text-muted-foreground" />
              Ready to Apply
            </button>
            <button
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
              onClick={() => {
                router.push("/jobs?status=INTERVIEW")
                setSearchOpen(false)
              }}
            >
              <Briefcase className="h-3 w-3 text-muted-foreground" />
              Interviews
            </button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Filters Shortcut */}
      <Button
        variant="ghost"
        size="icon"
        className="hidden lg:flex"
        onClick={() => router.push("/jobs")}
      >
        <Filter className="h-4 w-4" />
        <span className="sr-only">Filters</span>
      </Button>

      <div className="flex-1" />

      {/* Notifications */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
                {unreadCount}
              </span>
            )}
            <span className="sr-only">Notifications</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80">
          <DropdownMenuLabel className="flex items-center justify-between">
            Notifications
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {unreadCount} new
              </Badge>
            )}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <div className="max-h-80 overflow-y-auto">
            {notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={cn(
                  "flex cursor-pointer flex-col items-start gap-1 p-3",
                  !notification.read && "bg-muted/50"
                )}
              >
                <div className="flex w-full items-start gap-2">
                  {getNotificationIcon(notification.type)}
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {notification.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {notification.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {notification.time}
                    </p>
                  </div>
                  {!notification.read && (
                    <span className="h-2 w-2 rounded-full bg-primary" />
                  )}
                </div>
              </DropdownMenuItem>
            ))}
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="justify-center text-sm font-medium">
            View all notifications
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Theme Toggle */}
      <ThemeToggle />

      {/* Profile Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="rounded-full">
            {isLoading ? (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                {initials}
              </div>
            )}
            <span className="sr-only">Profile menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium">{displayName}</p>
              <p className="text-xs text-muted-foreground truncate">{displayEmail}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => router.push("/profile")}>
            <User className="mr-2 h-4 w-4" />
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push("/settings")}>
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            className="text-destructive focus:text-destructive"
            onClick={handleSignOut}
            disabled={isSigningOut}
          >
            {isSigningOut ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <LogOut className="mr-2 h-4 w-4" />
            )}
            {isSigningOut ? "Signing out..." : "Sign out"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
