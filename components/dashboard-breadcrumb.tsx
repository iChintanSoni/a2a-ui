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
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/dashboard">Workbench</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/dashboard/agents">Agent Library</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{agent?.card.name ?? "Unknown"}</BreadcrumbPage>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
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
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/dashboard">Workbench</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{chat?.title ?? "Chat"}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    );
  }

  // Known dashboard sections
  const label = pageLabels[pathname];
  if (label) {
    return (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>{label}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    );
  }

  // /dashboard (fallback)
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbPage>Workbench</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}
