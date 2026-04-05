"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BotIcon,
  MessageSquareIcon,
  CircleIcon,
  SettingsIcon,
  MessageSquarePlusIcon,
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
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { addChat, setActiveChat } from "@/lib/features/chats/chatsSlice";
import { setActiveAgent } from "@/lib/features/agents/agentsSlice";
import { AddAgent } from "@/components/add-agent";
import { Caption } from "@/components/typography";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useAppDispatch();

  const agents = useAppSelector((state) => state.agents.agents);
  const chats = useAppSelector((state) => state.chats.chats);
  const activeChatId = useAppSelector((state) => state.chats.activeChatId);

  const startChat = (agentUrl: string, agentId: string, agentName: string) => {
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
      })
    );
    router.push(`/dashboard/chat/${chatId}`);
  };

  const handleChatClick = (chatId: string) => {
    dispatch(setActiveChat(chatId));
    router.push(`/dashboard/chat/${chatId}`);
  };

  return (
    <Sidebar {...props}>
      <SidebarHeader className="px-4 py-3">
        <Link
          href="/dashboard"
          className="text-base font-semibold tracking-tight hover:opacity-80 transition-opacity"
        >
          A2A UI
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {/* Agents */}
        <SidebarGroup>
          <SidebarGroupLabel>Agents</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {agents.length === 0 ? (
                <Caption className="px-2 py-1">No agents connected.</Caption>
              ) : (
                agents.map((agent) => {
                  const settingsHref = `/dashboard/agents/${agent.id}/settings`;
                  const isActive = pathname.startsWith(
                    `/dashboard/agents/${agent.id}`
                  );
                  return (
                    <SidebarMenuItem key={agent.id}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={agent.displayName ?? agent.card.name}
                      >
                        <Link href={settingsHref}>
                          <BotIcon className="size-4 shrink-0" />
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
                              startChat(agent.url, agent.id, agent.displayName ?? agent.card.name)
                            }
                            aria-label="New chat"
                          >
                            <MessageSquarePlusIcon className="size-4" />
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
              {chats.length === 0 ? (
                <Caption className="px-2 py-1">No recent chats.</Caption>
              ) : (
                chats.map((chat) => (
                  <SidebarMenuItem key={chat.id}>
                    <SidebarMenuButton
                      isActive={chat.id === activeChatId}
                      onClick={() => handleChatClick(chat.id)}
                    >
                      <MessageSquareIcon className="size-4 shrink-0" />
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate text-sm leading-tight">
                          {chat.title}
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

      <SidebarFooter className="px-4 py-3">
        <AddAgent />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
