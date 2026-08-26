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
      <a
        href="#main-content"
        className="focus:bg-background sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:border focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:shadow-md"
      >
        Skip to main content
      </a>
      <AppSidebar />
      <SidebarInset className="h-dvh overflow-hidden">
        <header className="bg-card md:bg-background sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b px-4 md:px-6">
          <SidebarTrigger className="bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground -ms-1 size-[30px] rounded-lg shadow-xs md:hidden">
            <BotIcon className="size-[17px]" strokeWidth={1.9} />
          </SidebarTrigger>
          <SidebarTrigger className="-ms-1 hidden md:inline-flex" />
          <Separator
            orientation="vertical"
            className="me-1 hidden data-vertical:h-4 data-vertical:self-auto md:block"
          />
          <DashboardBreadcrumb />
          <div
            className="bg-surface-2 text-muted-foreground flex size-[30px] shrink-0 items-center justify-center rounded-full border text-[11px] font-bold md:hidden"
            aria-hidden="true"
          >
            L
          </div>
        </header>
        <main
          id="main-content"
          tabIndex={-1}
          className="flex min-h-0 flex-1 flex-col overflow-hidden pb-[66px] outline-none md:pb-0"
        >
          {children}
        </main>
        <MobileBottomNav />
      </SidebarInset>
    </SidebarProvider>
  );
}
