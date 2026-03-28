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
  User,
  Sliders,
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
  { name: "Documents", href: "/documents", icon: FileText },
  { name: "Companies", href: "/companies", icon: Building2 },
  { name: "Activity Log", href: "/logs", icon: ScrollText },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Add Job", href: "/manual-entry", icon: PlusCircle },
]

const bottomNavigation = [
  { name: "Profile", href: "/profile", icon: User },
  { name: "Templates", href: "/templates", icon: Sliders },
  { name: "Settings", href: "/settings", icon: Settings },
]

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar className="border-r border-sidebar-border">
      <SidebarHeader 
        className="px-4 py-5 relative overflow-hidden"
        style={{
          backgroundImage: 'url(/images/stripe-banner.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <Link href="/" className="flex items-center justify-center group relative z-10">
          <div className="bg-white/95 px-3 py-2 rounded">
            <Image
              src="/images/hirewire-logo.png"
              alt="HireWire"
              width={130}
              height={46}
              className="object-contain"
              style={{ width: 'auto', height: 'auto' }}
              priority
              loading="eager"
            />
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent className="px-3">
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-medium tracking-[0.15em] uppercase text-muted-foreground/70 px-2 mb-2">
            Pipeline
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map((item) => {
                const isActive = pathname === item.href || 
                  (item.href !== "/" && pathname.startsWith(item.href))
                return (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive}
                      className={cn(
                        "h-10 px-3 rounded-lg transition-colors",
                        isActive && "bg-primary/10 text-primary font-medium"
                      )}
                    >
                      <Link href={item.href}>
                        <item.icon className={cn(
                          "h-4 w-4",
                          isActive ? "text-primary" : "text-muted-foreground"
                        )} />
                        <span className="text-sm">{item.name}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="px-3 pb-4 border-t border-sidebar-border pt-4">
        <SidebarMenu>
          {bottomNavigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <SidebarMenuItem key={item.name}>
                <SidebarMenuButton 
                  asChild 
                  isActive={isActive}
                  className={cn(
                    "h-10 px-3 rounded-lg transition-colors",
                    isActive && "bg-primary/10 text-primary font-medium"
                  )}
                >
                  <Link href={item.href}>
                    <item.icon className={cn(
                      "h-4 w-4",
                      isActive ? "text-primary" : "text-muted-foreground"
                    )} />
                    <span className="text-sm">{item.name}</span>
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
