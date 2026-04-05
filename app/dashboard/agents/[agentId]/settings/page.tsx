"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { PlusIcon, Trash2Icon, SaveIcon, CheckCircle2Icon, XCircleIcon, RefreshCwIcon } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import {
  updateAgentAuth,
  updateAgentHeaders,
  updateAgentDisplayName,
  updateAgentCard,
  removeAgent,
  type AuthConfig,
  type CustomHeader,
} from "@/lib/features/agents/agentsSlice";
import { createClientFactory } from "@/lib/utils/auth";
import { checkCompliance } from "@/lib/utils/compliance";
import { AgentCardViewer } from "@/components/agent-card-viewer";
import { AgentCapabilitiesBadges } from "@/components/agent-capabilities";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Field, FieldGroup } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { PageTitle, SectionTitle, Caption, Muted, Mono, Small, ErrorText } from "@/components/typography";

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

  // Local copies for editing
  const [displayName, setDisplayName] = useState(agent?.displayName ?? "");
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

  if (!agent) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8">
        <Muted>Agent not found.</Muted>
        <button
          className="text-sm underline"
          onClick={() => router.push("/dashboard")}
        >
          Back to dashboard
        </button>
      </div>
    );
  }

  const saveDisplayName = () => {
    dispatch(updateAgentDisplayName({ agentId, displayName }));
    setDisplayNameSaved(true);
    setTimeout(() => setDisplayNameSaved(false), 2000);
  };

  const handleRefetchCard = async () => {
    if (!agent) return;
    setRefetching(true);
    setRefetchError(null);
    setRefetchSuccess(false);
    try {
      const factory = createClientFactory(agent.auth, agent.customHeaders);
      const client = await factory.createFromUrl(agent.url);
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
    router.push("/dashboard");
  };

  const activeTab =
    tab === "headers" ? "headers" : tab === "card" ? "card" : tab === "auth" ? "auth" : "general";

  const handleTabChange = (value: string) => {
    router.replace(`/dashboard/agents/${agentId}/settings?tab=${value}`);
  };

  const compliance = checkCompliance(agent.card);

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Agent identity header */}
      <div className="border-b px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <PageTitle>{agent.displayName ?? agent.card.name}</PageTitle>
            <Mono className="text-muted-foreground break-all">
              {agent.url}
            </Mono>
            <div className="flex items-center gap-2 pt-1">
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

          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive" size="sm">
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

      {/* Settings tabs */}
      <div className="px-6 py-6 max-w-2xl">
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="auth">Authentication</TabsTrigger>
            <TabsTrigger value="headers">Custom Headers</TabsTrigger>
            <TabsTrigger value="card">Agent Card</TabsTrigger>
          </TabsList>

          {/* ── General ─────────────────────────────────────────────── */}
          <TabsContent value="general" className="mt-6 space-y-6">
            <Muted>Customize how this agent appears in the UI.</Muted>
            <FieldGroup>
              <Field>
                <Label htmlFor="display-name">Display Name</Label>
                <Input
                  id="display-name"
                  placeholder={agent.card.name}
                  value={displayName}
                  onChange={(e) => {
                    setDisplayName(e.target.value);
                    setDisplayNameSaved(false);
                  }}
                />
              </Field>
            </FieldGroup>
            <Button onClick={saveDisplayName} className="gap-2">
              <SaveIcon className="size-4" />
              {displayNameSaved ? "Saved!" : "Save"}
            </Button>
          </TabsContent>

          {/* ── Authentication ──────────────────────────────────────── */}
          <TabsContent value="auth" className="mt-6 space-y-6">
            <Muted>Credentials are applied to every request sent to this agent.</Muted>

            <FieldGroup>
              <Field>
                <Label>Auth Type</Label>
                <Select
                  value={auth.type}
                  onValueChange={(v) =>
                    handleAuthTypeChange(v as AuthConfig["type"])
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="bearer">Bearer Token</SelectItem>
                    <SelectItem value="api-key">API Key</SelectItem>
                    <SelectItem value="basic">Basic Auth</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              {auth.type === "bearer" && (
                <Field>
                  <Label htmlFor="bearer-token">Token</Label>
                  <Input
                    id="bearer-token"
                    type="password"
                    placeholder="your-token"
                    value={auth.bearerToken ?? ""}
                    onChange={(e) =>
                      setAuth({ ...auth, bearerToken: e.target.value })
                    }
                  />
                </Field>
              )}

              {auth.type === "api-key" && (
                <>
                  <Field>
                    <Label htmlFor="api-key-header">Header Name</Label>
                    <Input
                      id="api-key-header"
                      placeholder="X-API-Key"
                      value={auth.apiKeyHeader ?? ""}
                      onChange={(e) =>
                        setAuth({ ...auth, apiKeyHeader: e.target.value })
                      }
                    />
                  </Field>
                  <Field>
                    <Label htmlFor="api-key-value">Key Value</Label>
                    <Input
                      id="api-key-value"
                      type="password"
                      placeholder="your-api-key"
                      value={auth.apiKeyValue ?? ""}
                      onChange={(e) =>
                        setAuth({ ...auth, apiKeyValue: e.target.value })
                      }
                    />
                  </Field>
                </>
              )}

              {auth.type === "basic" && (
                <>
                  <Field>
                    <Label htmlFor="basic-user">Username</Label>
                    <Input
                      id="basic-user"
                      placeholder="username"
                      value={auth.basicUsername ?? ""}
                      onChange={(e) =>
                        setAuth({ ...auth, basicUsername: e.target.value })
                      }
                    />
                  </Field>
                  <Field>
                    <Label htmlFor="basic-pass">Password</Label>
                    <Input
                      id="basic-pass"
                      type="password"
                      placeholder="password"
                      value={auth.basicPassword ?? ""}
                      onChange={(e) =>
                        setAuth({ ...auth, basicPassword: e.target.value })
                      }
                    />
                  </Field>
                </>
              )}
            </FieldGroup>

            <Button onClick={saveAuth} className="gap-2">
              <SaveIcon className="size-4" />
              {authSaved ? "Saved!" : "Save Auth"}
            </Button>
          </TabsContent>

          {/* ── Custom Headers ──────────────────────────────────────── */}
          <TabsContent value="headers" className="mt-6 space-y-4">
            <Muted>Additional headers sent with every request to this agent.</Muted>

            <div className="space-y-2">
              {headers.length === 0 && (
                <Muted className="py-2">No custom headers configured.</Muted>
              )}
              {headers.map((row, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    placeholder="Header name"
                    value={row.key}
                    onChange={(e) => updateHeader(i, "key", e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    placeholder="Value"
                    value={row.value}
                    onChange={(e) => updateHeader(i, "value", e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeHeaderRow(i)}
                    aria-label="Remove header"
                  >
                    <Trash2Icon className="size-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addHeaderRow}
              >
                <PlusIcon className="size-4" />
                Add Header
              </Button>
              <Button onClick={saveHeaders} size="sm" className="gap-2">
                <SaveIcon className="size-4" />
                {headersSaved ? "Saved!" : "Save Headers"}
              </Button>
            </div>
          </TabsContent>
          {/* ── Agent Card ──────────────────────────────────────── */}
          <TabsContent value="card" className="mt-6 space-y-8">

            {/* Re-fetch controls */}
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={handleRefetchCard}
                disabled={refetching}
              >
                <RefreshCwIcon className={`size-4 ${refetching ? "animate-spin" : ""}`} />
                {refetching ? "Fetching…" : "Re-fetch Agent Card"}
              </Button>
              {refetchSuccess && (
                <Caption className="text-green-600 inline">Card updated.</Caption>
              )}
              {refetchError && <ErrorText>{refetchError}</ErrorText>}
            </div>

            {/* Capabilities */}
            <div className="space-y-3">
              <SectionTitle>Capabilities</SectionTitle>
              <AgentCapabilitiesBadges
                capabilities={agent.card.capabilities}
                defaultInputModes={agent.card.defaultInputModes}
                defaultOutputModes={agent.card.defaultOutputModes}
              />
            </div>

            {/* Skills */}
            {agent.card.skills && agent.card.skills.length > 0 && (
              <div className="space-y-3">
                <SectionTitle>Skills ({agent.card.skills.length})</SectionTitle>
                <div className="space-y-2">
                  {agent.card.skills.map((skill) => (
                    <div
                      key={skill.id}
                      className="rounded-md border px-3 py-2 text-sm"
                    >
                      <Small>{skill.name}</Small>
                      <Caption className="mt-0.5">{skill.description}</Caption>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Compliance */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <SectionTitle>A2A Spec Compliance</SectionTitle>
                <Caption className="inline">
                  {compliance.passCount}/{compliance.checks.length} checks passed
                </Caption>
              </div>
              <div className="space-y-1.5">
                {compliance.checks.map((c) => (
                  <div key={c.id} className="flex items-start gap-2 text-xs">
                    {c.pass ? (
                      <CheckCircle2Icon className="size-3.5 mt-0.5 shrink-0 text-green-500" />
                    ) : (
                      <XCircleIcon className="size-3.5 mt-0.5 shrink-0 text-destructive" />
                    )}
                    <span className={c.pass ? "" : "text-destructive"}>
                      <Mono className="text-xs">{c.label}</Mono>
                      {!c.pass && (
                        <span className="text-muted-foreground">
                          {" "}— {c.message}
                        </span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Raw JSON viewer */}
            <div className="space-y-2">
              <SectionTitle>Raw Agent Card</SectionTitle>
              <AgentCardViewer card={agent.card} />
            </div>

          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
