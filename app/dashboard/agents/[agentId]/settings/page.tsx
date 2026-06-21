"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { LinkIcon, StarIcon, StarOffIcon } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import {
  updateAgentAuth,
  updateAgentHeaders,
  updateAgentDisplayName,
  updateAgentTags,
  toggleAgentFavorite,
  setAgentA2UIEnabled,
  updateAgentCard,
  removeAgent,
  type AuthConfig,
  type CustomHeader,
} from "@/lib/features/agents/agentsSlice";
import { createClientFactory } from "@/lib/utils/auth";
import { getErrorMessage } from "@/lib/utils/error";
import { normalizeAgentUrl, getAgentCardUrlFallback } from "@/lib/utils/url";
import { type Client } from "@a2a-js/sdk/client";
import { checkCompliance } from "@/lib/utils/compliance";
import { buildProtocolReport, protocolReportFilename } from "@/lib/utils/protocolReport";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { PageTitle, Caption, Muted, Mono } from "@/components/typography";
import { GeneralTab } from "@/components/agents/settings/GeneralTab";
import { AuthTab } from "@/components/agents/settings/AuthTab";
import { HeadersTab } from "@/components/agents/settings/HeadersTab";
import { CardTab } from "@/components/agents/settings/CardTab";

interface PageProps {
  params: Promise<{ agentId: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export default function AgentSettingsPage({ params, searchParams }: PageProps) {
  const { agentId } = use(params);
  const { tab } = use(searchParams);
  const router = useRouter();
  const dispatch = useAppDispatch();

  const agent = useAppSelector((s) =>
    s.agents.agents.find((a) => a.id === agentId)
  );

  const [displayName, setDisplayName] = useState(agent?.displayName ?? "");
  const [tagText, setTagText] = useState((agent?.tags ?? []).join(", "));
  const [a2uiEnabled, setA2uiEnabled] = useState(agent?.a2uiEnabled ?? false);
  const [displayNameSaved, setDisplayNameSaved] = useState(false);
  const [auth, setAuth] = useState<AuthConfig>(agent?.auth ?? { type: "none" });
  const [headers, setHeaders] = useState<CustomHeader[]>(agent?.customHeaders ?? []);
  const [authSaved, setAuthSaved] = useState(false);
  const [headersSaved, setHeadersSaved] = useState(false);
  const [refetching, setRefetching] = useState(false);
  const [refetchError, setRefetchError] = useState<string | null>(null);
  const [refetchSuccess, setRefetchSuccess] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const copyShareLink = () => {
    const url = new URL(window.location.origin + "/dashboard");
    url.searchParams.set("agentUrl", agent?.url ?? "");
    url.searchParams.set("authType", agent?.auth.type ?? "none");
    navigator.clipboard.writeText(url.toString()).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  };

  if (!agent) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8">
        <Muted>Agent not found.</Muted>
        <button className="text-sm underline" onClick={() => router.push("/dashboard")}>
          Back to dashboard
        </button>
      </div>
    );
  }

  const saveDisplayName = () => {
    dispatch(updateAgentDisplayName({ agentId, displayName }));
    dispatch(updateAgentTags({
      agentId,
      tags: tagText.split(",").map((t) => t.trim()).filter(Boolean),
    }));
    dispatch(setAgentA2UIEnabled({ agentId, enabled: a2uiEnabled }));
    setDisplayNameSaved(true);
    setTimeout(() => setDisplayNameSaved(false), 4000);
  };

  const handleRefetchCard = async () => {
    setRefetching(true);
    setRefetchError(null);
    setRefetchSuccess(false);
    try {
      const normalizedUrl = normalizeAgentUrl(agent.url);
      const factory = createClientFactory(agent.auth, agent.customHeaders, undefined, undefined, {
        a2uiEnabled: agent.a2uiEnabled,
      });

      let client: Client;
      try {
        client = await factory.createFromUrl(normalizedUrl);
      } catch (err) {
        const fallbackUrl = getAgentCardUrlFallback(normalizedUrl);
        if (fallbackUrl && fallbackUrl !== normalizedUrl) {
          try { client = await factory.createFromUrl(fallbackUrl); } catch { throw err; }
        } else {
          throw err;
        }
      }

      const card = await Promise.race([
        client.getAgentCard(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Request timed out after 10s")), 10_000)
        ),
      ]);
      dispatch(updateAgentCard({ agentId, card }));
      setRefetchSuccess(true);
      setTimeout(() => setRefetchSuccess(false), 4000);
    } catch (err: unknown) {
      setRefetchError(getErrorMessage(err, "Failed to fetch agent card."));
    } finally {
      setRefetching(false);
    }
  };

  const saveAuth = () => {
    dispatch(updateAgentAuth({ agentId, auth }));
    setAuthSaved(true);
    setTimeout(() => setAuthSaved(false), 4000);
  };

  const handleAuthChange = (next: AuthConfig) => {
    setAuth(next);
    setAuthSaved(false);
  };

  const addHeaderRow = () => { setHeaders((h) => [...h, { key: "", value: "" }]); setHeadersSaved(false); };
  const removeHeaderRow = (i: number) => { setHeaders((h) => h.filter((_, idx) => idx !== i)); setHeadersSaved(false); };
  const updateHeader = (i: number, field: "key" | "value", val: string) => {
    setHeaders((h) => h.map((row, idx) => (idx === i ? { ...row, [field]: val } : row)));
    setHeadersSaved(false);
  };

  const saveHeaders = () => {
    dispatch(updateAgentHeaders({ agentId, headers: headers.filter((h) => h.key.trim()) }));
    setHeadersSaved(true);
    setTimeout(() => setHeadersSaved(false), 4000);
  };

  const handleDelete = () => {
    dispatch(removeAgent(agentId));
    router.push("/dashboard");
  };

  const downloadFile = (name: string, content: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const VALID_TABS = new Set(["headers", "card", "auth"]);
  const activeTab = VALID_TABS.has(tab ?? "") ? (tab as string) : "general";

  const handleTabChange = (value: string) => {
    router.replace(`/dashboard/agents/${agentId}/settings?tab=${value}`);
  };

  const compliance = checkCompliance(agent.card);

  const exportProtocolReport = () => {
    const report = buildProtocolReport({ agent, compliance, logs: [], validationWarnings: [] });
    downloadFile(
      protocolReportFilename(agent.displayName ?? agent.card.name),
      JSON.stringify(report, null, 2),
      "application/json",
    );
  };

  return (
    <div className="min-w-0 flex-1 overflow-y-auto">
      {/* Agent identity header */}
      <div className="border-b px-4 py-5 sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 flex-col gap-1">
            <PageTitle>{agent.displayName ?? agent.card.name}</PageTitle>
            <Mono className="text-muted-foreground break-all">{agent.url}</Mono>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Badge variant={agent.status === "connected" ? "default" : "destructive"}>
                {agent.status}
              </Badge>
              <Caption className="inline">
                Protocol v{agent.card.protocolVersion} · Agent v{agent.card.version}
              </Caption>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap lg:shrink-0">
            <Button variant="outline" size="sm" onClick={copyShareLink} className="justify-center gap-2">
              <LinkIcon className="size-3.5" />
              {linkCopied ? "Copied!" : "Copy Link"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => dispatch(toggleAgentFavorite(agent.id))}
              className="justify-center gap-2"
            >
              {agent.favorite
                ? <StarIcon className="size-3.5 fill-current" />
                : <StarOffIcon className="size-3.5" />}
              {agent.favorite ? "Favorited" : "Favorite"}
            </Button>

            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto" variant="destructive" size="sm">
                  Remove Agent
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                  <DialogTitle>Remove Agent</DialogTitle>
                  <DialogDescription>
                    Remove <strong>{agent.displayName ?? agent.card.name}</strong> from this workspace?
                    Chat history will be kept but no new chats can be started.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
                  <Button variant="destructive" onClick={handleDelete}>Remove</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Settings tabs */}
      <div className="max-w-2xl px-4 py-6 sm:px-6">
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="max-w-full justify-start overflow-x-auto">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="auth">Authentication</TabsTrigger>
            <TabsTrigger value="headers">Custom Headers</TabsTrigger>
            <TabsTrigger value="card">Agent Card</TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <GeneralTab
              agentCard={agent.card}
              displayName={displayName}
              tagText={tagText}
              a2uiEnabled={a2uiEnabled}
              saved={displayNameSaved}
              onDisplayNameChange={(v) => { setDisplayName(v); setDisplayNameSaved(false); }}
              onTagTextChange={(v) => { setTagText(v); setDisplayNameSaved(false); }}
              onA2UIEnabledChange={(v) => { setA2uiEnabled(v); setDisplayNameSaved(false); }}
              onSave={saveDisplayName}
            />
          </TabsContent>

          <TabsContent value="auth">
            <AuthTab auth={auth} saved={authSaved} onAuthChange={handleAuthChange} onSave={saveAuth} />
          </TabsContent>

          <TabsContent value="headers">
            <HeadersTab
              headers={headers}
              saved={headersSaved}
              onAdd={addHeaderRow}
              onRemove={removeHeaderRow}
              onUpdate={updateHeader}
              onSave={saveHeaders}
            />
          </TabsContent>

          <TabsContent value="card">
            <CardTab
              agent={agent}
              compliance={compliance}
              refetching={refetching}
              refetchError={refetchError}
              refetchSuccess={refetchSuccess}
              onRefetch={handleRefetchCard}
              onExportReport={exportProtocolReport}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
