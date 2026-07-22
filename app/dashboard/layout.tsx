import { AppSidebar } from "@/components/app-sidebar";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardBreadcrumb } from "@/components/dashboard-breadcrumb";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { BotIcon } from "lucide-react";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="h-dvh overflow-hidden">
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b bg-card px-4 md:bg-background md:px-6">
          <SidebarTrigger className="-ms-1 size-[30px] rounded-lg bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 hover:text-primary-foreground md:hidden">
            <BotIcon className="size-[17px]" strokeWidth={1.9} />
          </SidebarTrigger>
          <SidebarTrigger className="-ms-1 hidden md:inline-flex" />
          <Separator
            orientation="vertical"
            className="me-1 hidden data-vertical:h-4 data-vertical:self-auto md:block"
          />
          <DashboardBreadcrumb />
          <div className="flex size-[30px] shrink-0 items-center justify-center rounded-full border bg-surface-2 text-[11px] font-bold text-muted-foreground md:hidden">
            L
          </div>
        </header>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden pb-[66px] md:pb-0">{children}</div>
        <MobileBottomNav />
      </SidebarInset>
    </SidebarProvider>
  );
}
