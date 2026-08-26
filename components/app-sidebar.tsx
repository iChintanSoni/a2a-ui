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

export function AppSidebar({ className, ...props }: React.ComponentProps<typeof Sidebar>) {
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
    <Sidebar className={className} {...props}>
      <SidebarHeader className="px-1.5 pt-2.5 pb-1">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              size="lg"
              className="hover:bg-transparent active:bg-transparent"
            >
              <Link href="/dashboard">
                <div className="bg-primary text-primary-foreground flex aspect-square size-8.5 shrink-0 items-center justify-center rounded-[9px] shadow-xs">
                  <BotIcon className="size-[19px]" />
                </div>
                <div className="grid flex-1 text-start leading-tight">
                  <span className="truncate text-[14.5px] font-bold tracking-tight">A2A UI</span>
                  <span className="text-sidebar-foreground/60 truncate text-[11.5px] font-medium">
                    Workbench
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="gap-4 px-1.5">
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/45 text-[10.5px] font-semibold tracking-wider uppercase">
            Workspace
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {workspaceItems.map(item => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    className="text-[13.5px] font-medium data-active:font-semibold"
                    isActive={item.exact ? pathname === item.href : pathname.startsWith(item.href)}
                  >
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                  {typeof workspaceCounts[item.href] === "number" && (
                    <SidebarMenuBadge className="border-sidebar-border bg-sidebar-accent/40 text-sidebar-foreground/60 rounded-full border font-semibold">
                      {workspaceCounts[item.href]}
                    </SidebarMenuBadge>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/45 text-[10.5px] font-semibold tracking-wider uppercase">
            Tools
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {toolItems.map(item => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    className="text-[13.5px] font-medium data-active:font-semibold"
                    isActive={pathname.startsWith(item.href)}
                  >
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
          <SidebarGroupLabel className="text-sidebar-foreground/45 text-[10.5px] font-semibold tracking-wider uppercase">
            Agents
          </SidebarGroupLabel>
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
                        className="text-[13px] font-medium"
                        tooltip={agent.displayName ?? agent.card.name}
                      >
                        <Link href={settingsHref}>
                          <BotIcon className="text-sidebar-foreground/50" />
                          <span className="truncate">{agent.displayName ?? agent.card.name}</span>
                          <CircleIcon
                            className={`ms-auto size-1.75 shrink-0 fill-current ${
                              agent.status === "connected"
                                ? "text-primary"
                                : agent.status === "error"
                                  ? "text-destructive"
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
          <SidebarGroupLabel className="text-sidebar-foreground/45 text-[10.5px] font-semibold tracking-wider uppercase">
            Recent Chats
          </SidebarGroupLabel>
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
                      className="h-auto items-start py-1.5"
                    >
                      <MessageSquareIcon className="text-sidebar-foreground/50 mt-0.5" />
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <span className="truncate text-[12.5px] leading-tight font-semibold">
                          {chat.title}
                          {chat.pinned ? <PinIcon className="ms-1 inline size-3" /> : null}
                        </span>
                        <Caption className="text-sidebar-foreground/45 truncate text-[11px]">
                          {chat.agentName}
                        </Caption>
                      </div>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-sidebar-border border-t px-3.5 py-2.5">
        <div className="flex items-center gap-2.5">
          <div className="border-sidebar-border bg-sidebar-accent/40 text-sidebar-foreground/70 flex size-7 shrink-0 items-center justify-center rounded-full border">
            <BotIcon className="size-3.5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[12.5px] leading-tight font-semibold">
              Local workspace
            </div>
            <div className="text-sidebar-foreground/45 truncate text-[11px] font-medium">
              Stored in this browser
            </div>
          </div>
          <ModeToggle compact />
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
