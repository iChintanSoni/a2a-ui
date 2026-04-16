"use client";

import Link from "next/link";
import { BotIcon, MessageSquareIcon, StarIcon } from "lucide-react";
import { AddAgent } from "@/components/add-agent";
import { WorkspaceActions } from "@/components/workspace-actions";
import { Button } from "@/components/ui/button";
import { H2, Muted, P, Caption } from "@/components/typography";
import { useAppSelector } from "@/lib/hooks";

export default function DashboardPage() {
  const agents = useAppSelector((state) => state.agents.agents);
  const chats = useAppSelector((state) => state.chats.chats);
  const activeChats = chats.filter((chat) => !chat.archived);
  const favoriteAgents = agents.filter((agent) => agent.favorite);

  return (
    <div className="flex-1 space-y-8 overflow-y-auto p-4 sm:p-6 md:p-8">
      <div className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <H2>A2A Workbench</H2>
          <P className="mt-1 text-sm text-muted-foreground">
            Connect agents, inspect protocol behavior, and manage saved conversations.
          </P>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <WorkspaceActions />
          <AddAgent />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/dashboard/agents" className="rounded-md border p-4 transition-colors hover:bg-muted/40">
          <div className="flex items-center gap-2">
            <BotIcon className="size-4" />
            <Caption className="font-medium text-foreground">Agents</Caption>
          </div>
          <div className="mt-3 text-3xl font-semibold">{agents.length}</div>
          <Muted className="mt-1">Search, filter, tag, and favorite local agents.</Muted>
        </Link>
        <Link href="/dashboard/conversations" className="rounded-md border p-4 transition-colors hover:bg-muted/40">
          <div className="flex items-center gap-2">
            <MessageSquareIcon className="size-4" />
            <Caption className="font-medium text-foreground">Conversations</Caption>
          </div>
          <div className="mt-3 text-3xl font-semibold">{activeChats.length}</div>
          <Muted className="mt-1">Rename, archive, delete, and export chats.</Muted>
        </Link>
        <div className="rounded-md border p-4">
          <div className="flex items-center gap-2">
            <StarIcon className="size-4" />
            <Caption className="font-medium text-foreground">Favorites</Caption>
          </div>
          <div className="mt-3 text-3xl font-semibold">{favoriteAgents.length}</div>
          <Muted className="mt-1">Pinned agents appear first in the library.</Muted>
        </div>
      </div>

      {agents.length === 0 ? (
        <div className="flex min-h-75 flex-col items-center justify-center rounded-md border border-dashed bg-muted/10 p-6 text-center">
          <Muted>No agents connected yet.</Muted>
          <P className="mt-2 max-w-xl text-sm text-muted-foreground">
            Connect an A2A-compatible agent or import a workspace to start testing.
          </P>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <WorkspaceActions />
            <AddAgent />
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/dashboard/agents">Open Agent Library</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard/conversations">Open Conversations</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
