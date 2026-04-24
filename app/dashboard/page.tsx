"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { BotIcon, MessageSquareIcon, StarIcon, ListTodoIcon } from "lucide-react";
import { AddAgent } from "@/components/add-agent";
import { WorkspaceActions } from "@/components/workspace-actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Muted, P, PageTitle } from "@/components/typography";
import { useAppSelector } from "@/lib/hooks";

type MetricCardProps = {
  title: string;
  value: number;
  description: string;
  href?: string;
  icon: LucideIcon;
};

function MetricCard({ title, value, description, href, icon: Icon }: MetricCardProps) {
  const content = (
    <Card size="sm" className="h-full transition-colors hover:bg-muted/40">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardAction>
          <Icon />
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold tabular-nums">{value}</div>
        <CardDescription className="mt-2">{description}</CardDescription>
      </CardContent>
    </Card>
  );

  if (!href) return content;

  return (
    <Link href={href} className="block h-full">
      {content}
    </Link>
  );
}

export default function DashboardPage() {
  const agents = useAppSelector((state) => state.agents.agents);
  const chats = useAppSelector((state) => state.chats.chats);
  const activeChats = chats.filter((chat) => !chat.archived);
  const favoriteAgents = agents.filter((agent) => agent.favorite);
  const taskCount = chats.reduce(
    (count, chat) => count + chat.items.filter((item) => item.kind === "task-status").length,
    0,
  );

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-6 overflow-y-auto p-4 sm:gap-8 sm:p-6 md:p-8">
      <div className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <PageTitle>A2A Workbench</PageTitle>
          <P className="mt-1 text-sm text-muted-foreground">
            Connect agents, inspect protocol behavior, and manage saved conversations.
          </P>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <WorkspaceActions />
          <AddAgent variant="default" className="max-sm:flex-1" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          href="/dashboard/agents"
          icon={BotIcon}
          title="Agents"
          value={agents.length}
          description="Search, filter, tag, and favorite local agents."
        />
        <MetricCard
          href="/dashboard/conversations"
          icon={MessageSquareIcon}
          title="Conversations"
          value={activeChats.length}
          description="Rename, archive, delete, and export chats."
        />
        <MetricCard
          href="/dashboard/tasks"
          icon={ListTodoIcon}
          title="Tasks"
          value={taskCount}
          description="Review task states, artifacts, and correlated warnings."
        />
        <MetricCard
          icon={StarIcon}
          title="Favorites"
          value={favoriteAgents.length}
          description="Pinned agents appear first in the library."
        />
      </div>

      {agents.length === 0 ? (
        <div className="flex min-h-75 flex-col items-center justify-center rounded-md border border-dashed bg-muted/10 p-6 text-center">
          <Muted>No agents connected yet.</Muted>
          <P className="mt-2 max-w-xl text-sm text-muted-foreground">
            Connect an A2A-compatible agent or import a workspace to start testing.
          </P>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <WorkspaceActions />
            <AddAgent variant="default" />
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button className="max-sm:flex-1" asChild>
            <Link href="/dashboard/agents">Open Agent Library</Link>
          </Button>
          <Button variant="outline" className="max-sm:flex-1" asChild>
            <Link href="/dashboard/conversations">Open Conversations</Link>
          </Button>
          <Button variant="outline" className="max-sm:flex-1" asChild>
            <Link href="/dashboard/tasks">Open Tasks</Link>
          </Button>
          <Button variant="outline" className="max-sm:flex-1" asChild>
            <Link href="/dashboard/embed">Open Embed Demo</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
