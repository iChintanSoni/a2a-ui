"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAppSelector, useAppDispatch } from "@/lib/hooks";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AddAgent } from "@/components/add-agent";
import { H2, Muted, P } from "@/components/typography";
import { addChat } from "@/lib/features/chats/chatsSlice";
import { setActiveAgent } from "@/lib/features/agents/agentsSlice";
import { checkCompliance } from "@/lib/utils/compliance";
import { MessageSquarePlusIcon, SettingsIcon } from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const agents = useAppSelector((state) => state.agents.agents);

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
        timestamp: Date.now(),
      })
    );
    router.push(`/dashboard/chat/${chatId}`);
  };

  return (
    <div className="flex-1 space-y-6 overflow-y-auto p-4 sm:p-6 md:p-8">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <H2>Connected Agents</H2>
        <AddAgent />
      </div>

      {agents.length === 0 ? (
        <div className="bg-muted/10 flex h-75 flex-col items-center justify-center rounded-xl border border-dashed p-4 text-center sm:p-8 md:h-100">
          <Muted>No agents connected yet.</Muted>
          <P className="text-muted-foreground mt-2 w-full text-sm sm:w-3/4 lg:w-1/2">
            Connect an agent compatible with the A2A standard to get started.
            You can provide the URL of any A2A server.
          </P>
          <div className="mt-6">
            <AddAgent />
          </div>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <Card
              key={agent.id}
              className="overflow-hidden transition-shadow hover:shadow-lg"
            >
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div className="space-y-1">
                  <CardTitle className="text-xl">{agent.card.name}</CardTitle>
                  <CardDescription className="max-w-50 truncate text-xs font-mono">
                    {agent.url}
                  </CardDescription>
                </div>
                <Badge
                  variant={
                    agent.status === "connected" ? "default" : "destructive"
                  }
                >
                  {agent.status}
                </Badge>
              </CardHeader>
              <CardContent className="pt-4">
                <p className="text-muted-foreground text-sm">
                  {agent.card.description ||
                    "No description provided by this agent."}
                </p>
                <div className="text-muted-foreground mt-4 flex items-center space-x-2 text-xs">
                  <span className="text-foreground font-medium">Protocol:</span>
                  <span>v{agent.card.protocolVersion}</span>
                  <span className="border-l px-2">
                    <span className="text-foreground pr-1 font-medium">
                      Agent:
                    </span>
                    v{agent.card.version}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {(() => {
                    const r = checkCompliance(agent.card);
                    const variant =
                      r.failCount === 0
                        ? "default"
                        : r.passCount >= r.failCount
                          ? "secondary"
                          : "destructive";
                    return (
                      <Badge variant={variant} className="text-xs">
                        {r.failCount === 0
                          ? "Compliant"
                          : `${r.failCount} issue${r.failCount > 1 ? "s" : ""}`}
                      </Badge>
                    );
                  })()}
                  {agent.auth.type !== "none" && (
                    <Badge variant="secondary" className="text-xs capitalize">
                      {agent.auth.type === "api-key"
                        ? "API Key"
                        : agent.auth.type === "bearer"
                          ? "Bearer"
                          : "Basic Auth"}
                    </Badge>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex gap-2 pt-0">
                <Button
                  size="sm"
                  className="flex-1"
                  disabled={agent.status !== "connected"}
                  onClick={() => startChat(agent.url, agent.card.name)}
                >
                  <MessageSquarePlusIcon className="size-4" />
                  New Chat
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <Link href={`/dashboard/agents/${agent.id}/settings`}>
                    <SettingsIcon className="size-4" />
                    <span className="sr-only">Settings</span>
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
