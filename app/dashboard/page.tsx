"use client";

import { useRef } from "react";
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
import { H2, Muted, P, Caption, Mono } from "@/components/typography";
import { addChat } from "@/lib/features/chats/chatsSlice";
import { addAgent, setActiveAgent, type Agent } from "@/lib/features/agents/agentsSlice";
import { checkCompliance } from "@/lib/utils/compliance";
import { MessageSquarePlusIcon, SettingsIcon, DownloadIcon, UploadIcon } from "lucide-react";

// ─── Import/export helpers ────────────────────────────────────────────────────

function exportAgents(agents: Agent[]) {
  const blob = new Blob([JSON.stringify(agents, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "a2a-agents.json";
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const agents = useAppSelector((state) => state.agents.agents);
  const importRef = useRef<HTMLInputElement>(null);



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

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = JSON.parse(reader.result as string) as Agent[];
        if (!Array.isArray(imported)) throw new Error("Expected an array.");
        for (const raw of imported) {
          if (!raw.id || !raw.url || !raw.card) continue;
          dispatch(
            addAgent({
              ...raw,
              id: crypto.randomUUID(), // avoid ID collisions
              status: "disconnected",
              error: undefined,
            })
          );
        }
      } catch {
        // silently ignore malformed files
      }
    };
    reader.readAsText(file);
    // Reset so same file can be re-imported
    e.target.value = "";
  };

  return (
    <div className="flex-1 space-y-6 overflow-y-auto p-4 sm:p-6 md:p-8">
      {/* Single hidden file input for import — shared across empty and populated states */}
      <input ref={importRef} type="file" accept=".json,application/json" className="hidden" onChange={handleImport} />

      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <H2>Connected Agents</H2>
        <div className="flex items-center gap-2">
          {agents.length > 0 && (
            <>
              <Button variant="outline" size="sm" onClick={() => exportAgents(agents)} title="Export all agents as JSON">
                <DownloadIcon className="size-4" />
                Export
              </Button>
              <Button variant="outline" size="sm" onClick={() => importRef.current?.click()} title="Import agents from JSON">
                <UploadIcon className="size-4" />
                Import
              </Button>
            </>
          )}
          <AddAgent />
        </div>
      </div>

      {agents.length === 0 ? (
        <div className="bg-muted/10 flex h-75 flex-col items-center justify-center rounded-xl border border-dashed p-4 text-center sm:p-8 md:h-100">
          <Muted>No agents connected yet.</Muted>
          <P className="text-muted-foreground mt-2 w-full text-sm sm:w-3/4 lg:w-1/2">
            Connect an agent compatible with the A2A standard to get started.
            You can provide the URL of any A2A server.
          </P>
          <div className="mt-6 flex items-center gap-2">
            <Button variant="outline" onClick={() => importRef.current?.click()}>
              <UploadIcon className="size-4" />
              Import agents
            </Button>
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
                  <CardTitle className="text-xl">{agent.displayName ?? agent.card.name}</CardTitle>
                  <CardDescription className="max-w-50 truncate">
                    <Mono className="text-xs">{agent.url}</Mono>
                  </CardDescription>
                </div>
                <Badge
                  variant={
                    agent.status === "connected"
                      ? "default"
                      : agent.status === "error"
                        ? "destructive"
                        : "secondary"
                  }
                >
                  {agent.status === "disconnected" ? "connecting…" : agent.status}
                </Badge>
              </CardHeader>
              <CardContent className="pt-4">
                <Muted>
                  {agent.card.description ||
                    "No description provided by this agent."}
                </Muted>
                <div className="mt-4 flex items-center space-x-2">
                  <Caption className="inline text-foreground font-medium">Protocol:</Caption>
                  <Caption className="inline">v{agent.card.protocolVersion}</Caption>
                  <span className="border-l px-2 flex items-center gap-1">
                    <Caption className="inline text-foreground font-medium">Agent:</Caption>
                    <Caption className="inline">v{agent.card.version}</Caption>
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
                  onClick={() => startChat(agent.url, agent.displayName ?? agent.card.name)}
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
