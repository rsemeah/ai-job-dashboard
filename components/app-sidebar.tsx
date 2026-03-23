"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Briefcase,
  ListChecks,
  Send,
  FileText,
  Building2,
  ScrollText,
  BarChart3,
  Settings,
  PlusCircle,
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

const navigation = [
  { name: "Home", href: "/", icon: LayoutDashboard },
  { name: "All Jobs", href: "/jobs", icon: Briefcase },
  { name: "Ready to Apply", href: "/ready-queue", icon: ListChecks },
  { name: "Applied", href: "/applications", icon: Send },
  { name: "Materials", href: "/documents", icon: FileText },
  { name: "Companies", href: "/companies", icon: Building2 },
  { name: "Activity Log", href: "/logs", icon: ScrollText },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Add Job", href: "/manual-entry", icon: PlusCircle },
]

const bottomNavigation = [
  { name: "Settings", href: "/settings", icon: Settings },
]

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/hirewire-logo.png"
            alt="HireWire Logo"
            width={36}
            height={36}
            className="rounded-lg"
          />
          <div className="flex flex-col">
            <span className="font-semibold text-lg leading-tight">HireWire</span>
            <span className="text-[10px] text-muted-foreground tracking-widest uppercase">Jobs Connected</span>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map((item) => {
                const isActive = pathname === item.href || 
                  (item.href !== "/" && pathname.startsWith(item.href))
                return (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link href={item.href}>
                        <item.icon className={cn("h-4 w-4", isActive && "text-primary")} />
                        <span>{item.name}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          {bottomNavigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <SidebarMenuItem key={item.name}>
                <SidebarMenuButton asChild isActive={isActive}>
                  <Link href={item.href}>
                    <item.icon className={cn("h-4 w-4", isActive && "text-primary")} />
                    <span>{item.name}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
