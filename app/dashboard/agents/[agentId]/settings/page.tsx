"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { PlusIcon, Trash2Icon, SaveIcon } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import {
  updateAgentAuth,
  updateAgentHeaders,
  removeAgent,
  type AuthConfig,
  type CustomHeader,
} from "@/lib/features/agents/agentsSlice";
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
  const [auth, setAuth] = useState<AuthConfig>(
    agent?.auth ?? { type: "none" }
  );
  const [headers, setHeaders] = useState<CustomHeader[]>(
    agent?.customHeaders ?? []
  );
  const [authSaved, setAuthSaved] = useState(false);
  const [headersSaved, setHeadersSaved] = useState(false);

  if (!agent) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground p-8">
        <p>Agent not found.</p>
        <button
          className="text-sm underline"
          onClick={() => router.push("/dashboard")}
        >
          Back to dashboard
        </button>
      </div>
    );
  }

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

  const activeTab = tab === "headers" ? "headers" : "auth";

  const handleTabChange = (value: string) => {
    router.replace(`/dashboard/agents/${agentId}/settings?tab=${value}`);
  };

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Agent identity header */}
      <div className="border-b px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold">{agent.card.name}</h1>
            <p className="text-muted-foreground text-sm font-mono break-all">
              {agent.url}
            </p>
            <div className="flex items-center gap-2 pt-1">
              <Badge
                variant={agent.status === "connected" ? "default" : "destructive"}
              >
                {agent.status}
              </Badge>
              <span className="text-muted-foreground text-xs">
                Protocol v{agent.card.protocolVersion} · Agent v{agent.card.version}
              </span>
            </div>
          </div>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="destructive" size="sm">
                Remove Agent
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                <DialogTitle>Remove Agent</DialogTitle>
                <DialogDescription>
                  Remove <strong>{agent.card.name}</strong> from this workspace?
                  Chat history will be kept but no new chats can be started.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => {}}>
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
            <TabsTrigger value="auth">Authentication</TabsTrigger>
            <TabsTrigger value="headers">Custom Headers</TabsTrigger>
          </TabsList>

          {/* ── Authentication ──────────────────────────────────────── */}
          <TabsContent value="auth" className="mt-6 space-y-6">
            <p className="text-muted-foreground text-sm">
              Credentials are applied to every request sent to this agent.
            </p>

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
            <p className="text-muted-foreground text-sm">
              Additional headers sent with every request to this agent.
            </p>

            <div className="space-y-2">
              {headers.length === 0 && (
                <p className="text-muted-foreground text-sm py-2">
                  No custom headers configured.
                </p>
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
        </Tabs>
      </div>
    </div>
  );
}
