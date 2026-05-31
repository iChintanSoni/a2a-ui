import { useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
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
import { normalizeAgentUrl, getAgentCardUrlFallback } from "@/lib/utils/url";
import { type Client } from "@a2a-js/sdk/client";
import { checkCompliance } from "@/lib/utils/compliance";
import { buildProtocolReport, protocolReportFilename } from "@/lib/utils/protocolReport";
import { downloadFile } from "@/lib/utils/download";
import { GeneralTab } from "./agent-settings/general-tab";
import { AuthTab } from "./agent-settings/auth-tab";
import { HeadersTab } from "./agent-settings/headers-tab";
import { CardTab } from "./agent-settings/card-tab";
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

export default function AgentSettingsPage() {
  const { agentId = "" } = useParams<{ agentId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") ?? undefined;
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const agent = useAppSelector((s) =>
    s.agents.agents.find((a) => a.id === agentId)
  );

  // Local copies for editing
  const [displayName, setDisplayName] = useState(agent?.displayName ?? "");
  const [tagText, setTagText] = useState((agent?.tags ?? []).join(", "));
  const [a2uiEnabled, setA2uiEnabled] = useState(agent?.a2uiEnabled ?? false);
  const [displayNameSaved, setDisplayNameSaved] = useState(false);
  const [auth, setAuth] = useState<AuthConfig>(
    agent?.auth ?? { type: "none" }
  );
  const [headers, setHeaders] = useState<CustomHeader[]>(
    agent?.customHeaders ?? []
  );
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
        <button
          className="text-sm underline"
          onClick={() => navigate("/dashboard")}
        >
          Back to dashboard
        </button>
      </div>
    );
  }

  const saveDisplayName = () => {
    dispatch(updateAgentDisplayName({ agentId, displayName }));
    dispatch(
      updateAgentTags({
        agentId,
        tags: tagText.split(",").map((tag) => tag.trim()).filter(Boolean),
      })
    );
    dispatch(setAgentA2UIEnabled({ agentId, enabled: a2uiEnabled }));
    setDisplayNameSaved(true);
    setTimeout(() => setDisplayNameSaved(false), 2000);
  };

  const handleRefetchCard = async () => {
    if (!agent) return;
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
          try {
            client = await factory.createFromUrl(fallbackUrl);
          } catch {
            throw err;
          }
        } else {
          throw err;
        }
      }

      const card = await client.getAgentCard();
      dispatch(updateAgentCard({ agentId, card }));

      setRefetchSuccess(true);
      setTimeout(() => setRefetchSuccess(false), 3000);
    } catch (err: unknown) {
      setRefetchError(
        err instanceof Error ? err.message : "Failed to fetch agent card."
      );
    } finally {
      setRefetching(false);
    }
  };

  const handleAuthTypeChange = (type: AuthConfig["type"]) => {
    setAuth({ type });
    setAuthSaved(false);
  };

  const saveAuth = () => {
    dispatch(updateAgentAuth({ agentId, auth }));
    setAuthSaved(true);
    setTimeout(() => setAuthSaved(false), 2000);
  };

  const addHeaderRow = () => {
    setHeaders((h) => [...h, { key: "", value: "" }]);
    setHeadersSaved(false);
  };
  const removeHeaderRow = (i: number) => {
    setHeaders((h) => h.filter((_, idx) => idx !== i));
    setHeadersSaved(false);
  };
  const updateHeader = (i: number, field: "key" | "value", val: string) => {
    setHeaders((h) =>
      h.map((row, idx) => (idx === i ? { ...row, [field]: val } : row))
    );
    setHeadersSaved(false);
  };

  const saveHeaders = () => {
    dispatch(
      updateAgentHeaders({
        agentId,
        headers: headers.filter((h) => h.key.trim()),
      })
    );
    setHeadersSaved(true);
    setTimeout(() => setHeadersSaved(false), 2000);
  };

  const handleDelete = () => {
    dispatch(removeAgent(agentId));
    navigate("/dashboard");
  };

  const activeTab =
    tab === "headers" ? "headers" : tab === "card" ? "card" : tab === "auth" ? "auth" : "general";

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value }, { replace: true });
  };

  const compliance = checkCompliance(agent.card);
  const exportProtocolReport = () => {
    const report = buildProtocolReport({
      agent,
      compliance,
      logs: [],
      validationWarnings: [],
    });
    downloadFile(
      protocolReportFilename(agent.displayName ?? agent.card.name),
      JSON.stringify(report, null, 2),
      "application/json"
    );
  };

  return (
    <div className="min-w-0 flex-1 overflow-y-auto">
      {/* Agent identity header */}
      <div className="border-b px-4 py-5 sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 flex-col gap-1">
            <PageTitle>{agent.displayName ?? agent.card.name}</PageTitle>
            <Mono className="text-muted-foreground break-all">
              {agent.url}
            </Mono>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Badge
                variant={agent.status === "connected" ? "default" : "destructive"}
              >
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
              {agent.favorite ? <StarIcon className="size-3.5 fill-current" /> : <StarOffIcon className="size-3.5" />}
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
                <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleDelete}>
                  Remove
                </Button>
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

          {/* ── General ─────────────────────────────────────────────── */}
          <TabsContent value="general" className="mt-6 space-y-6">
            <GeneralTab
              cardName={agent.card.name}
              displayName={displayName}
              setDisplayName={setDisplayName}
              tagText={tagText}
              setTagText={setTagText}
              a2uiEnabled={a2uiEnabled}
              setA2uiEnabled={setA2uiEnabled}
              displayNameSaved={displayNameSaved}
              setDisplayNameSaved={setDisplayNameSaved}
              saveDisplayName={saveDisplayName}
            />
          </TabsContent>

          {/* ── Authentication ──────────────────────────────────────── */}
          <TabsContent value="auth" className="mt-6 space-y-6">
            <AuthTab
              auth={auth}
              setAuth={setAuth}
              handleAuthTypeChange={handleAuthTypeChange}
              authSaved={authSaved}
              saveAuth={saveAuth}
            />
          </TabsContent>

          {/* ── Custom Headers ──────────────────────────────────────── */}
          <TabsContent value="headers" className="mt-6 space-y-4">
            <HeadersTab
              headers={headers}
              updateHeader={updateHeader}
              removeHeaderRow={removeHeaderRow}
              addHeaderRow={addHeaderRow}
              headersSaved={headersSaved}
              saveHeaders={saveHeaders}
            />
          </TabsContent>
          {/* ── Agent Card ──────────────────────────────────────── */}
          <TabsContent value="card" className="mt-6 space-y-8">
            <CardTab
              card={agent.card}
              handleRefetchCard={handleRefetchCard}
              refetching={refetching}
              exportProtocolReport={exportProtocolReport}
              refetchSuccess={refetchSuccess}
              refetchError={refetchError}
              compliance={compliance}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
