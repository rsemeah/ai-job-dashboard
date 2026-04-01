import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Topbar } from "@/components/topbar"
import { CoachBubble } from "@/components/coach-bubble"
import { PremiumProvider } from "@/hooks/use-premium"
import { UpgradeModal } from "@/components/upgrade-modal"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <PremiumProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <Topbar />
          <main className="flex-1 overflow-auto p-6">
            {children}
          </main>
        </SidebarInset>
        {/* Floating AI Coach bubble - appears on all dashboard pages */}
        <CoachBubble />
        {/* Global upgrade modal */}
        <UpgradeModal />
      </SidebarProvider>
    </PremiumProvider>
  )
}
