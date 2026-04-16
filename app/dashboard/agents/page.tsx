"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MessageSquarePlusIcon,
  SettingsIcon,
  StarIcon,
  StarOffIcon,
} from "lucide-react";
import { AddAgent } from "@/components/add-agent";
import { WorkspaceActions } from "@/components/workspace-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { H2, Muted, Caption, Mono, Small } from "@/components/typography";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { addChat } from "@/lib/features/chats/chatsSlice";
import { setActiveAgent, toggleAgentFavorite, type Agent } from "@/lib/features/agents/agentsSlice";
import { checkCompliance } from "@/lib/utils/compliance";

type StatusFilter = "all" | "connected" | "disconnected" | "error" | "favorite";
type SortMode = "favorite" | "name" | "last-used" | "compliance";

function getTransport(agent: Agent) {
  return agent.card.preferredTransport ?? agent.card.additionalInterfaces?.[0]?.transport ?? "JSONRPC";
}

export default function AgentsPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const agents = useAppSelector((state) => state.agents.agents);
  const chats = useAppSelector((state) => state.chats.chats);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [transport, setTransport] = useState("all");
  const [tag, setTag] = useState("all");
  const [sort, setSort] = useState<SortMode>("favorite");

  const lastUsedByAgent = useMemo(() => {
    const map = new Map<string, number>();
    for (const chat of chats) {
      map.set(chat.agentUrl, Math.max(map.get(chat.agentUrl) ?? 0, chat.timestamp));
    }
    return map;
  }, [chats]);

  const tags = useMemo(
    () => Array.from(new Set(agents.flatMap((agent) => agent.tags ?? []))).sort(),
    [agents]
  );
  const transports = useMemo(
    () => Array.from(new Set(agents.map((agent) => getTransport(agent)))).sort(),
    [agents]
  );

  const filteredAgents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return agents
      .filter((agent) => {
        const searchText = [
          agent.displayName,
          agent.card.name,
          agent.card.description,
          agent.url,
          ...(agent.tags ?? []),
          ...(agent.card.skills ?? []).flatMap((skill) => [skill.name, ...(skill.tags ?? [])]),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (normalizedQuery && !searchText.includes(normalizedQuery)) return false;
        if (status === "favorite" && !agent.favorite) return false;
        if (status !== "all" && status !== "favorite" && agent.status !== status) return false;
        if (transport !== "all" && getTransport(agent) !== transport) return false;
        if (tag !== "all" && !(agent.tags ?? []).includes(tag)) return false;
        return true;
      })
      .sort((a, b) => {
        if (sort === "favorite") {
          return Number(b.favorite ?? false) - Number(a.favorite ?? false) || a.card.name.localeCompare(b.card.name);
        }
        if (sort === "last-used") {
          return (lastUsedByAgent.get(b.url) ?? 0) - (lastUsedByAgent.get(a.url) ?? 0);
        }
        if (sort === "compliance") {
          return checkCompliance(a.card).failCount - checkCompliance(b.card).failCount;
        }
        return (a.displayName ?? a.card.name).localeCompare(b.displayName ?? b.card.name);
      });
  }, [agents, lastUsedByAgent, query, sort, status, tag, transport]);

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
      <div className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <H2>Agent Library</H2>
          <Muted>Search, filter, sort, tag, and favorite local A2A agents.</Muted>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <WorkspaceActions />
          <AddAgent />
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_160px_160px_160px_160px]">
        <Input placeholder="Search agents, skills, tags, or URLs" value={query} onChange={(e) => setQuery(e.target.value)} />
        <Select value={status} onValueChange={(value) => setStatus(value as StatusFilter)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="favorite">Favorites</SelectItem>
            <SelectItem value="connected">Connected</SelectItem>
            <SelectItem value="disconnected">Disconnected</SelectItem>
            <SelectItem value="error">Error</SelectItem>
          </SelectContent>
        </Select>
        <Select value={transport} onValueChange={setTransport}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All transports</SelectItem>
            {transports.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={tag} onValueChange={setTag}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All tags</SelectItem>
            {tags.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(value) => setSort(value as SortMode)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="favorite">Sort favorites</SelectItem>
            <SelectItem value="name">Sort name</SelectItem>
            <SelectItem value="last-used">Sort last used</SelectItem>
            <SelectItem value="compliance">Sort compliance</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredAgents.length === 0 ? (
        <div className="rounded-md border border-dashed p-8 text-center">
          <Muted>No agents match the current filters.</Muted>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filteredAgents.map((agent) => {
            const compliance = checkCompliance(agent.card);
            const agentName = agent.displayName ?? agent.card.name;
            const lastUsed = lastUsedByAgent.get(agent.url);
            return (
              <div key={agent.id} className="rounded-md border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <Small className="truncate">{agentName}</Small>
                    <Mono className="block truncate text-muted-foreground">{agent.url}</Mono>
                  </div>
                  <Button variant="ghost" size="icon" className="size-8" onClick={() => dispatch(toggleAgentFavorite(agent.id))}>
                    {agent.favorite ? <StarIcon className="size-4 fill-current" /> : <StarOffIcon className="size-4" />}
                  </Button>
                </div>
                <Muted className="mt-3 line-clamp-2">{agent.card.description || "No description provided."}</Muted>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Badge variant={agent.status === "connected" ? "default" : agent.status === "error" ? "destructive" : "secondary"}>
                    {agent.status}
                  </Badge>
                  <Badge variant="secondary">{getTransport(agent)}</Badge>
                  <Badge variant={compliance.failCount === 0 ? "default" : "destructive"}>
                    {compliance.failCount === 0 ? "Compliant" : `${compliance.failCount} issue${compliance.failCount === 1 ? "" : "s"}`}
                  </Badge>
                  {(agent.tags ?? []).map((item) => <Badge key={item} variant="outline">{item}</Badge>)}
                </div>
                <Caption className="mt-3 block">
                  {lastUsed ? `Last used ${new Date(lastUsed).toLocaleString()}` : "No conversations yet"}
                </Caption>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" disabled={agent.status !== "connected"} onClick={() => startChat(agent.url, agentName)}>
                    <MessageSquarePlusIcon className="size-4" />
                    New Chat
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/dashboard/agents/${agent.id}/settings`}>
                      <SettingsIcon className="size-4" />
                      Settings
                    </Link>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
