"use client";

import { TaskState } from "@a2a-js/sdk";
import Link from "next/link";
import { useCallback } from "react";
import { useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  BotIcon,
  MessageSquareIcon,
  StarIcon,
  ListTodoIcon,
  MessageSquarePlusIcon,
  SparklesIcon,
} from "lucide-react";
import { AddAgent } from "@/components/add-agent";
import { WorkspaceActions } from "@/components/workspace-actions";
import { PresetGalleryModal } from "@/components/preset-gallery-modal";
import { Button } from "@/components/ui/button";
import { Muted, P, PageTitle } from "@/components/typography";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { setActiveAgent } from "@/lib/features/agents/agentsSlice";
import { addChat } from "@/lib/features/chats/chatsSlice";
import type { Chat, TaskStatusItem } from "@/lib/features/chats/chatsSlice";

type MetricCardProps = {
  title: string;
  value: number;
  description: string;
  href?: string;
  icon: LucideIcon;
};

function MetricCard({ title, value, description, href, icon: Icon }: MetricCardProps) {
  const content = (
    <div className="bg-card hover:bg-muted/40 flex h-full flex-col gap-1.5 rounded-lg border p-3.5 shadow-xs transition-colors sm:gap-3.5 sm:p-5">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-xs font-semibold sm:text-[13px]">{title}</span>
        <Icon className="text-fg-subtle size-3.75 sm:size-4.25" />
      </div>
      <div className="text-[27px] leading-tight font-bold tracking-tight tabular-nums sm:text-[31px] sm:leading-none">
        {value}
      </div>
      <p className="text-fg-subtle hidden text-[12.5px] leading-snug sm:block">{description}</p>
    </div>
  );

  if (!href) return content;

  return (
    <Link href={href} className="block h-full">
      {content}
    </Link>
  );
}

function chatStatus(chat: Chat): { label: string; dotClassName: string } {
  const lastTaskStatus = chat.items.findLast(
    (item): item is TaskStatusItem => item.kind === "task-status",
  );
  if (lastTaskStatus?.state === TaskState.TASK_STATE_INPUT_REQUIRED) {
    return { label: "input required", dotClassName: "bg-warning-foreground" };
  }
  return { label: "active", dotClassName: "bg-primary" };
}

export default function DashboardPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const agents = useAppSelector(state => state.agents.agents);
  const chats = useAppSelector(state => state.chats.chats);
  const activeChats = chats.filter(chat => !chat.archived);
  const favoriteAgents = agents.filter(agent => agent.favorite);
  const taskCount = chats.reduce(
    (count, chat) => count + chat.items.filter(item => item.kind === "task-status").length,
    0,
  );
  const recentChats = [...activeChats].sort((a, b) => b.timestamp - a.timestamp).slice(0, 3);

  const startChat = useCallback(
    (agentUrl: string, agentName: string) => {
      dispatch(setActiveAgent(agentUrl));
      const chatId = crypto.randomUUID();
      dispatch(
        addChat({
          id: chatId,
          title: `Chat with ${agentName}`,
          agentUrl,
          agentName,
          lastMessage: "",
          timestamp: Date.now(),
        }),
      );
      router.push(`/dashboard/chat/${chatId}`);
    },
    [dispatch, router],
  );

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-5 overflow-y-auto p-4 sm:gap-8 sm:p-6 md:p-8">
      <div className="flex flex-row items-center justify-between gap-4 lg:items-center">
        <div>
          <PageTitle className="text-[21px] font-bold tracking-tight sm:text-[26px]">
            <span className="sm:hidden">Workbench</span>
            <span className="hidden sm:inline">A2A Workbench</span>
          </PageTitle>
          <P className="text-muted-foreground mt-2 hidden max-w-[46ch] text-sm font-medium sm:block">
            Connect agents, inspect protocol behavior, and manage saved conversations.
          </P>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:w-auto">
          <div className="hidden sm:block">
            <WorkspaceActions />
          </div>
          <AddAgent label="Add" variant="default" className="sm:hidden" />
          <AddAgent variant="default" className="hidden sm:inline-flex" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
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
        <div className="bg-muted/10 flex min-h-48 flex-col items-center justify-center rounded-lg border border-dashed p-5 text-center sm:min-h-75 sm:p-6">
          <Muted>No agents connected yet.</Muted>
          <P className="text-muted-foreground mt-2 max-w-xl text-sm">
            Explore curated example agents, connect an A2A-compatible agent, or import a workspace
            to start testing.
          </P>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2 sm:mt-6">
            <PresetGalleryModal
              trigger={
                <Button variant="default" className="gap-1.5">
                  <SparklesIcon className="size-4" />
                  Explore Example Gallery
                </Button>
              }
            />
            <div className="hidden sm:block">
              <WorkspaceActions />
            </div>
            <AddAgent variant="outline" />
          </div>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <div className="min-w-0">
            <h2 className="mb-3.5 text-sm font-bold tracking-tight">Connected agents</h2>
            <div className="flex flex-col gap-2.5">
              {agents.map(agent => {
                const agentName = agent.displayName ?? agent.card.name;
                return (
                  <div
                    key={agent.id}
                    className="bg-card flex items-center gap-3.5 rounded-lg border p-4 shadow-xs"
                  >
                    <div className="bg-brand-soft text-brand-soft-foreground flex size-9 shrink-0 items-center justify-center rounded-lg">
                      <BotIcon className="size-4.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-[13.5px] font-semibold">{agentName}</span>
                        <span
                          className={`size-1.75 shrink-0 rounded-full ${
                            agent.status === "connected"
                              ? "bg-primary shadow-[0_0_0_3px_var(--brand-soft)]"
                              : agent.status === "error"
                                ? "bg-destructive shadow-[0_0_0_3px_var(--destructive-soft)]"
                                : "bg-muted-foreground"
                          }`}
                        />
                      </div>
                      <div className="text-fg-subtle mt-0.5 truncate font-mono text-[11.5px]">
                        {agent.url}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0 max-sm:hidden"
                      disabled={agent.status !== "connected"}
                      onClick={() => startChat(agent.url, agentName)}
                    >
                      <MessageSquarePlusIcon className="size-3.5" />
                      New Chat
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="min-w-0">
            <h2 className="mb-3.5 text-sm font-bold tracking-tight">Recent conversations</h2>
            {recentChats.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center">
                <Muted>No conversations yet.</Muted>
              </div>
            ) : (
              <div className="bg-card overflow-hidden rounded-lg border shadow-xs">
                {recentChats.map((chat, index) => {
                  const status = chatStatus(chat);
                  return (
                    <Link
                      key={chat.id}
                      href={`/dashboard/chat/${chat.id}`}
                      className={`hover:bg-muted/40 flex items-center gap-2.5 px-4 py-3.5 transition-colors ${
                        index < recentChats.length - 1 ? "border-b" : ""
                      }`}
                    >
                      <span className={`size-1.75 shrink-0 rounded-full ${status.dotClassName}`} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] font-semibold">{chat.title}</div>
                        <div className="text-fg-subtle truncate text-[11.5px]">
                          {chat.agentName} ·{" "}
                          {status.label === "input required"
                            ? "input required"
                            : `${chat.items.length} items`}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
