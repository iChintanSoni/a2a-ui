"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { BotIcon, MessageSquareIcon, CircleIcon } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { addChat, setActiveChat } from "@/lib/features/chats/chatsSlice";
import { setActiveAgent } from "@/lib/features/agents/agentsSlice";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const agents = useAppSelector((state) => state.agents.agents);
  const activeAgentUrl = useAppSelector((state) => state.agents.activeAgentUrl);
  const chats = useAppSelector((state) => state.chats.chats);
  const activeChatId = useAppSelector((state) => state.chats.activeChatId);

  const handleAgentClick = (agentUrl: string, agentName: string) => {
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
        <span className="text-base font-semibold tracking-tight">A2A UI</span>
      </SidebarHeader>

      <SidebarContent>
        {/* Agents */}
        <SidebarGroup>
          <SidebarGroupLabel>Agents</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {agents.length === 0 ? (
                <p className="text-muted-foreground px-2 py-1 text-xs">No agents connected.</p>
              ) : (
                agents.map((agent) => (
                  <SidebarMenuItem key={agent.url}>
                    <SidebarMenuButton
                      isActive={agent.url === activeAgentUrl}
                      onClick={() => handleAgentClick(agent.url, agent.card.name)}
                    >
                      <BotIcon className="size-4 shrink-0" />
                      <span className="truncate">{agent.card.name}</span>
                      <CircleIcon
                        className={`ms-auto size-2 shrink-0 fill-current ${
                          agent.status === "connected"
                            ? "text-green-500"
                            : agent.status === "error"
                              ? "text-red-500"
                              : "text-muted-foreground"
                        }`}
                      />
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))
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
                <p className="text-muted-foreground px-2 py-1 text-xs">No recent chats.</p>
              ) : (
                chats.map((chat) => (
                  <SidebarMenuItem key={chat.id}>
                    <SidebarMenuButton
                      isActive={chat.id === activeChatId}
                      onClick={() => handleChatClick(chat.id)}
                    >
                      <MessageSquareIcon className="size-4 shrink-0" />
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate text-sm leading-tight">{chat.title}</span>
                        <span className="text-muted-foreground truncate text-xs">
                          {chat.agentName}
                        </span>
                      </div>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  );
}
