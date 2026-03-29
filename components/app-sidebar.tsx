"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import {
  Briefcase,
  FileText,
  User,
  Settings,
  Grid2X2,
  CheckSquare,
  Send,
  Building2,
  SlidersHorizontal,
  History,
  BarChart3,
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
import { DiagonalStripes } from "@/components/off-white-stripes"
import { cn } from "@/lib/utils"

// Pipeline navigation - main workflow
const pipelineNav = [
  { name: "Home", href: "/", icon: Grid2X2 },
  { name: "All Jobs", href: "/jobs", icon: Briefcase },
  { name: "Ready to Apply", href: "/ready-queue", icon: CheckSquare },
  { name: "Applied", href: "/applications", icon: Send },
  { name: "Materials", href: "/documents", icon: FileText },
  { name: "Companies", href: "/companies", icon: Building2 },
  { name: "Activity Log", href: "/logs", icon: History },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Add Job", href: "/jobs/new", icon: PlusCircle },
]

// Bottom navigation - settings/profile
const bottomNav = [
  { name: "Profile", href: "/profile", icon: User },
  { name: "Templates", href: "/templates", icon: SlidersHorizontal },
  { name: "Settings", href: "/settings", icon: Settings },
]

export function AppSidebar() {
  const pathname = usePathname()

  const renderNavItem = (item: { name: string; href: string; icon: React.ComponentType<{ className?: string }> }) => {
    const isActive = pathname === item.href || 
      (item.href !== "/" && pathname.startsWith(item.href))
    return (
      <SidebarMenuItem key={item.name}>
        <SidebarMenuButton 
          asChild 
          isActive={isActive}
          className={cn(
            "h-10 px-3 rounded-lg transition-all relative",
            isActive && "bg-accent text-foreground font-medium"
          )}
        >
          <Link href={item.href}>
            <item.icon className={cn(
              "h-4 w-4",
              isActive ? "text-foreground" : "text-muted-foreground"
            )} />
            <span className="text-sm">{item.name}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    )
  }

  return (
    <Sidebar className="border-r border-sidebar-border relative overflow-hidden">
      {/* Off-White diagonal stripes in corners */}
      <DiagonalStripes position="top-left" size="md" variant="black" opacity={0.08} />
      <DiagonalStripes position="top-right" size="sm" variant="black" opacity={0.05} />
      
      <SidebarHeader className="px-4 py-5 relative z-10">
        <Link href="/" className="flex items-center justify-center">
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
        </Link>
      </SidebarHeader>
      
      <SidebarContent className="px-3 relative z-10">
        {/* Pipeline Section */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase px-3">
            Pipeline
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {pipelineNav.map(renderNavItem)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      <SidebarFooter className="px-3 pb-4 relative z-10">
        {/* Bottom nav items */}
        <SidebarMenu className="border-t border-sidebar-border pt-3">
          {bottomNav.map(renderNavItem)}
        </SidebarMenu>
        <div className="text-[10px] text-muted-foreground text-center mt-4 px-3 py-2 bg-muted/30 rounded">
          myhirewire.com
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
