"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArchiveIcon,
  BotIcon,
  Code2Icon,
  GitCompareIcon,
  HomeIcon,
  LibraryIcon,
  MessageSquareIcon,
  CircleIcon,
  MessageSquarePlusIcon,
  ListTodoIcon,
  PinIcon,
  ShieldCheckIcon,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { addChat, setActiveChat } from "@/lib/features/chats/chatsSlice";
import { setActiveAgent } from "@/lib/features/agents/agentsSlice";
import { AddAgent } from "@/components/add-agent";
import { ModeToggle } from "@/components/mode-toggle";
import { Caption } from "@/components/typography";

const workspaceItems = [
  {
    title: "Workbench",
    href: "/dashboard",
    icon: HomeIcon,
    exact: true,
  },
  {
    title: "Agent Library",
    href: "/dashboard/agents",
    icon: LibraryIcon,
  },
  {
    title: "Conversations",
    href: "/dashboard/conversations",
    icon: ArchiveIcon,
  },
  {
    title: "Tasks",
    href: "/dashboard/tasks",
    icon: ListTodoIcon,
  },
];

const toolItems = [
  {
    title: "Compare Runs",
    href: "/dashboard/compare",
    icon: GitCompareIcon,
  },
  {
    title: "QA Harness",
    href: "/dashboard/qa",
    icon: ShieldCheckIcon,
  },
  {
    title: "Embed Demo",
    href: "/dashboard/embed",
    icon: Code2Icon,
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useAppDispatch();

  const agents = useAppSelector(state => state.agents.agents);
  const chats = useAppSelector(state => state.chats.chats);
  const activeChats = chats.filter(chat => !chat.archived);
  const taskCount = chats.reduce(
    (count, chat) => count + chat.items.filter(item => item.kind === "task-status").length,
    0,
  );
  const workspaceCounts: Record<string, number | undefined> = {
    "/dashboard/agents": agents.length,
    "/dashboard/conversations": activeChats.length,
    "/dashboard/tasks": taskCount,
  };
  const recentChats = chats
    .filter(chat => !chat.archived)
    .sort((a, b) => {
      if (Boolean(a.pinned) !== Boolean(b.pinned)) return a.pinned ? -1 : 1;
      return b.timestamp - a.timestamp;
    })
    .slice(0, 10);
  const activeChatId = useAppSelector(state => state.chats.activeChatId);

  const startChat = (agentUrl: string, agentName: string) => {
    dispatch(setActiveAgent(agentUrl));
    const chatId = crypto.randomUUID();
    dispatch(
      addChat({
        id: chatId,
        title: `Chat with ${agentName}`,
        agentUrl,
        agentName,
        lastMessage: "",
        timestamp: Number(new Date()),
      }),
    );
    router.push(`/dashboard/chat/${chatId}`);
  };

  const handleChatClick = (chatId: string) => {
    dispatch(setActiveChat(chatId));
    router.push(`/dashboard/chat/${chatId}`);
  };

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg">
              <Link href="/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <BotIcon />
                </div>
                <div className="grid flex-1 text-start text-sm leading-tight">
                  <span className="truncate font-semibold">A2A UI</span>
                  <span className="truncate text-xs text-sidebar-foreground/70">Workbench</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {workspaceItems.map(item => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={item.exact ? pathname === item.href : pathname.startsWith(item.href)}
                  >
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                  {typeof workspaceCounts[item.href] === "number" && (
                    <SidebarMenuBadge>{workspaceCounts[item.href]}</SidebarMenuBadge>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Tools</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {toolItems.map(item => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={pathname.startsWith(item.href)}>
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Agents */}
        <SidebarGroup>
          <SidebarGroupLabel>Agents</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {agents.length === 0 ? (
                <Caption className="px-2 py-1">No agents connected.</Caption>
              ) : (
                agents.map(agent => {
                  const settingsHref = `/dashboard/agents/${agent.id}/settings`;
                  const isActive = pathname.startsWith(`/dashboard/agents/${agent.id}`);
                  return (
                    <SidebarMenuItem key={agent.id}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={agent.displayName ?? agent.card.name}
                      >
                        <Link href={settingsHref}>
                          <BotIcon />
                          <span className="truncate">{agent.displayName ?? agent.card.name}</span>
                          <CircleIcon
                            className={`ms-auto size-2 shrink-0 fill-current ${
                              agent.status === "connected"
                                ? "text-green-500"
                                : agent.status === "error"
                                  ? "text-red-500"
                                  : "text-muted-foreground"
                            }`}
                          />
                        </Link>
                      </SidebarMenuButton>

                      {/* Quick actions */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <SidebarMenuAction
                            onClick={() =>
                              startChat(agent.url, agent.displayName ?? agent.card.name)
                            }
                            aria-label="New chat"
                          >
                            <MessageSquarePlusIcon />
                          </SidebarMenuAction>
                        </TooltipTrigger>
                        <TooltipContent side="right">New chat</TooltipContent>
                      </Tooltip>
                    </SidebarMenuItem>
                  );
                })
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Recent Chats */}
        <SidebarGroup>
          <SidebarGroupLabel>Recent Chats</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {recentChats.length === 0 ? (
                <Caption className="px-2 py-1">No recent chats.</Caption>
              ) : (
                recentChats.map(chat => (
                  <SidebarMenuItem key={chat.id}>
                    <SidebarMenuButton
                      isActive={chat.id === activeChatId}
                      onClick={() => handleChatClick(chat.id)}
                    >
                      <MessageSquareIcon />
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate text-sm leading-tight">
                          {chat.title}
                          {chat.pinned ? <PinIcon className="ms-1 inline size-3" /> : null}
                        </span>
                        <Caption className="truncate">{chat.agentName}</Caption>
                      </div>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="gap-1 px-4 py-3">
        <ModeToggle />
        <AddAgent className="w-full justify-start" variant="ghost" />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
