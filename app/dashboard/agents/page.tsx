"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MessageSquarePlusIcon,
  SearchIcon,
  SettingsIcon,
  StarIcon,
} from "lucide-react";
import { AddAgent } from "@/components/add-agent";
import { WorkspaceActions } from "@/components/workspace-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageTitle, Muted } from "@/components/typography";
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
  const qaRuns = useAppSelector((state) => state.qa.runs);
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
  const latestQaByAgent = useMemo(() => {
    const map = new Map<string, (typeof qaRuns)[number]>();
    for (const run of qaRuns) {
      const existing = map.get(run.agentUrl);
      if (!existing || run.completedAt > existing.completedAt) {
        map.set(run.agentUrl, run);
      }
    }
    return map;
  }, [qaRuns]);

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
    <div className="flex min-w-0 flex-1 flex-col gap-6 overflow-y-auto p-4 sm:p-6 md:p-8">
      <div className="hidden flex-col items-start justify-between gap-4 sm:flex lg:flex-row lg:items-center">
        <div>
          <PageTitle className="text-[26px] font-bold tracking-tight">Agent Library</PageTitle>
          <Muted className="mt-2 text-sm font-medium">
            Search, filter, sort, tag, and favorite local A2A agents.
          </Muted>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <WorkspaceActions />
          <AddAgent variant="default" className="max-sm:flex-1" />
        </div>
      </div>

      <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative min-w-60 flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-subtle" />
          <input
            className="h-9.5 w-full rounded-md border border-border-strong bg-card ps-9 pe-3 text-[13px] font-medium shadow-xs outline-none placeholder:text-fg-subtle focus-visible:ring-3 focus-visible:ring-ring/50"
            placeholder="Search agents, skills, tags, or URLs"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-0.5 sm:contents">
          <Select value={status} onValueChange={(value) => setStatus(value as StatusFilter)}>
            <SelectTrigger className="w-auto min-w-32 shrink-0 max-sm:h-8 max-sm:rounded-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="favorite">Favorites</SelectItem>
              <SelectItem value="connected">Connected</SelectItem>
              <SelectItem value="disconnected">Disconnected</SelectItem>
              <SelectItem value="error">Error</SelectItem>
            </SelectContent>
          </Select>
          <Select value={transport} onValueChange={setTransport}>
            <SelectTrigger className="w-auto min-w-32 shrink-0 max-sm:h-8 max-sm:rounded-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All transports</SelectItem>
              {transports.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={tag} onValueChange={setTag}>
            <SelectTrigger className="w-auto min-w-28 shrink-0 max-sm:h-8 max-sm:rounded-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All tags</SelectItem>
              {tags.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(value) => setSort(value as SortMode)}>
            <SelectTrigger className="w-auto min-w-36 shrink-0 max-sm:hidden"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="favorite">Sort: Favorites</SelectItem>
              <SelectItem value="name">Sort: Name</SelectItem>
              <SelectItem value="last-used">Sort: Last used</SelectItem>
              <SelectItem value="compliance">Sort: Compliance</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {filteredAgents.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <Muted>No agents match the current filters.</Muted>
          <Muted className="mt-2 block text-xs">
            Try clearing the status, transport, or tag filters, or add a new agent.
          </Muted>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filteredAgents.map((agent) => {
            const compliance = checkCompliance(agent.card);
            const agentName = agent.displayName ?? agent.card.name;
            const lastUsed = lastUsedByAgent.get(agent.url);
            const latestQa = latestQaByAgent.get(agent.url);
            return (
              <div key={agent.id} className="min-w-0 rounded-lg border bg-card p-4 shadow-xs sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.75">
                    <div className="flex size-9.5 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand-soft-foreground">
                      <BotAvatarIcon />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-[15px] font-bold">{agentName}</span>
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
                      <div className="mt-0.5 truncate font-mono text-xs text-fg-subtle">{agent.url}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => dispatch(toggleAgentFavorite(agent.id))}
                    aria-label={agent.favorite ? `Unfavorite ${agentName}` : `Favorite ${agentName}`}
                    title={agent.favorite ? "Remove from favorites" : "Add to favorites"}
                    className={agent.favorite ? "shrink-0 text-primary" : "shrink-0 text-fg-subtle hover:text-fg-muted"}
                  >
                    <StarIcon className={`size-4.5 ${agent.favorite ? "fill-current" : ""}`} />
                  </button>
                </div>
                <p className="my-3.5 text-[13px] leading-relaxed text-muted-foreground line-clamp-2">
                  {agent.card.description || "No description provided."}
                </p>
                <div className="mb-3.5 flex flex-wrap gap-1.75">
                  <Badge variant={agent.status === "connected" ? "brand" : agent.status === "error" ? "destructive" : "outline"} className="gap-1.25">
                    {agent.status === "connected" && <span className="size-1.25 rounded-full bg-current" />}
                    {agent.status}
                  </Badge>
                  <Badge variant="outline" className="font-mono">{getTransport(agent)}</Badge>
                  <Badge variant={compliance.failCount === 0 ? "outline" : "destructive"}>
                    {compliance.failCount === 0 ? "compliant" : `${compliance.failCount} issue${compliance.failCount === 1 ? "" : "s"}`}
                  </Badge>
                  {latestQa && (
                    <Badge variant={latestQa.passed ? "brand" : "destructive"}>
                      QA {latestQa.passed ? "passing" : "failing"}
                    </Badge>
                  )}
                  {(agent.tags ?? []).map((item) => <Badge key={item} variant="outline">{item}</Badge>)}
                </div>
                <div className="mb-3.5 text-[11.5px] font-medium text-fg-subtle">
                  {lastUsed ? `Last used ${new Date(lastUsed).toLocaleString()}` : "No conversations yet"}
                  {latestQa ? ` · Last QA ${new Date(latestQa.completedAt).toLocaleString()}` : ""}
                </div>
                <div className="flex flex-wrap gap-2.25">
                  <Button className="max-sm:flex-1" size="sm" disabled={agent.status !== "connected"} onClick={() => startChat(agent.url, agentName)}>
                    <MessageSquarePlusIcon className="size-3.5" />
                    New Chat
                  </Button>
                  <Button className="max-sm:flex-1" size="sm" variant="outline" asChild>
                    <Link href={`/dashboard/agents/${agent.id}/settings`}>
                      <SettingsIcon className="size-3.5" />
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

function BotAvatarIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3.5" y="9" width="17" height="9" rx="2.5" />
      <path d="M9 9V6.5h6V9" />
    </svg>
  );
}
