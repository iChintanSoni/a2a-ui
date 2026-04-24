"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppSelector } from "@/lib/hooks";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export function DashboardBreadcrumb() {
  const pathname = usePathname();
  const agents = useAppSelector((s) => s.agents.agents);
  const chats = useAppSelector((s) => s.chats.chats);

  const pageLabels: Record<string, string> = {
    "/dashboard": "Workbench",
    "/dashboard/agents": "Agent Library",
    "/dashboard/conversations": "Conversations",
    "/dashboard/tasks": "Tasks",
    "/dashboard/compare": "Compare Runs",
    "/dashboard/qa": "QA Harness",
    "/dashboard/embed": "Embed Demo",
  };

  // /dashboard/agents/[agentId]/settings
  const agentSettingsMatch = pathname.match(
    /^\/dashboard\/agents\/([^/]+)\/settings/
  );
  if (agentSettingsMatch) {
    const agent = agents.find((a) => a.id === agentSettingsMatch[1]);
    return (
      <Breadcrumb className="min-w-0 flex-1 overflow-hidden">
        <BreadcrumbList className="min-w-0 flex-nowrap overflow-hidden">
          <BreadcrumbItem className="hidden shrink-0 sm:inline-flex">
            <BreadcrumbLink asChild>
              <Link href="/dashboard">Workbench</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator className="hidden sm:inline-flex" />
          <BreadcrumbItem className="shrink-0">
            <BreadcrumbLink asChild>
              <Link href="/dashboard/agents">Agent Library</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator className="shrink-0" />
          <BreadcrumbItem className="min-w-0">
            <BreadcrumbPage className="block truncate">{agent?.card.name ?? "Unknown"}</BreadcrumbPage>
          </BreadcrumbItem>
          <BreadcrumbSeparator className="hidden shrink-0 sm:inline-flex" />
          <BreadcrumbItem className="hidden shrink-0 sm:inline-flex">
            <BreadcrumbPage>Settings</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    );
  }

  // /dashboard/chat/[chatId]
  const chatMatch = pathname.match(/^\/dashboard\/chat\/([^/]+)/);
  if (chatMatch) {
    const chat = chats.find((c) => c.id === chatMatch[1]);
    return (
      <Breadcrumb className="min-w-0 flex-1 overflow-hidden">
        <BreadcrumbList className="min-w-0 flex-nowrap overflow-hidden">
          <BreadcrumbItem className="shrink-0">
            <BreadcrumbLink asChild>
              <Link href="/dashboard">Workbench</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator className="shrink-0" />
          <BreadcrumbItem className="min-w-0">
            <BreadcrumbPage className="block truncate">{chat?.title ?? "Chat"}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    );
  }

  // Known dashboard sections
  const label = pageLabels[pathname];
  if (label) {
    return (
      <Breadcrumb className="min-w-0 flex-1 overflow-hidden">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage className="block truncate">{label}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    );
  }

  // /dashboard (fallback)
  return (
    <Breadcrumb className="min-w-0 flex-1 overflow-hidden">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbPage>Workbench</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}
