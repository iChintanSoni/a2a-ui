"use client";

import type { ComponentProps } from "react";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { useAppDispatch } from "@/lib/hooks";
import { addAgent, type AuthConfig, type CustomHeader } from "@/lib/features/agents/agentsSlice";
import {
  runAgentConnectionDiagnostic,
  summarizeAuth,
  summarizeHeaders,
  type AgentConnectionDiagnostic,
} from "@/lib/features/agents/diagnostics";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Muted, ErrorText, Caption, Small } from "@/components/typography";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Field, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const DEFAULT_AUTH: AuthConfig = { type: "none" };

type AddAgentProps = {
  className?: string;
  variant?: ComponentProps<typeof Button>["variant"];
  size?: ComponentProps<typeof Button>["size"];
};

export function AddAgent({ className, variant = "outline", size }: AddAgentProps) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("http://localhost:3001");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [diagnostic, setDiagnostic] = useState<AgentConnectionDiagnostic | null>(null);

  // Auth state
  const [auth, setAuth] = useState<AuthConfig>(DEFAULT_AUTH);

  // Custom headers state
  const [headers, setHeaders] = useState<CustomHeader[]>([]);

  const dispatch = useAppDispatch();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Pre-fill from share link: ?agentUrl=...&authType=...
  useEffect(() => {
    const agentUrl = searchParams.get("agentUrl");
    const authType = searchParams.get("authType") as AuthConfig["type"] | null;
    if (agentUrl) {
      setUrl(agentUrl);
      if (authType && ["none", "bearer", "api-key", "basic"].includes(authType)) {
        setAuth({ type: authType });
      }
      setOpen(true);
      // Clean URL so refreshing doesn't re-open the dialog
      router.replace("/dashboard");
    }
  }, [searchParams, router]);

  const handleAuthTypeChange = (type: AuthConfig["type"]) => {
    setAuth({ type });
  };

  const addHeaderRow = () => setHeaders((h) => [...h, { key: "", value: "" }]);
  const removeHeaderRow = (i: number) =>
    setHeaders((h) => h.filter((_, idx) => idx !== i));
  const updateHeader = (i: number, field: "key" | "value", val: string) =>
    setHeaders((h) => h.map((row, idx) => (idx === i ? { ...row, [field]: val } : row)));

  const resetForm = () => {
    setUrl("http://localhost:3001");
    setAuth(DEFAULT_AUTH);
    setHeaders([]);
    setError(null);
    setDiagnostic(null);
  };

  const handleOpenChange = (val: boolean) => {
    setOpen(val);
    if (!val) resetForm();
  };

  const handleAddAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setDiagnostic({
      status: "checking",
      inputUrl: url,
      transports: [],
      authSummary: summarizeAuth(auth),
      headerSummary: summarizeHeaders(headers),
    });

    try {
      const result = await runAgentConnectionDiagnostic({ url, auth, headers });
      setDiagnostic(result.diagnostic);

      if (!result.card || !result.finalUrl) {
        throw new Error(result.diagnostic.error ?? "Failed to fetch agent card.");
      }

      dispatch(
        addAgent({
          id: crypto.randomUUID(),
          url: result.finalUrl,
          card: result.card,
          status: "connected",
          auth,
          customHeaders: headers.filter((h) => h.key.trim()),
        })
      );

      setOpen(false);
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to connect. Check the URL and try again."
      );
      setDiagnostic((current) =>
        current
          ? {
              ...current,
              status: "error",
              error:
                err instanceof Error
                  ? err.message
                  : "Failed to connect. Check the URL and try again.",
            }
          : current,
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} className={className}>
          <PlusIcon data-icon="inline-start" />
          Add Agent
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md">
        <form onSubmit={handleAddAgent}>
          <DialogHeader>
            <DialogTitle>Add Agent</DialogTitle>
            <DialogDescription>
              Connect to an A2A-compatible agent by URL.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="connection" className="mt-4">
            <TabsList className="w-full overflow-x-auto">
              <TabsTrigger value="connection" className="flex-1">
                Connection
              </TabsTrigger>
              <TabsTrigger value="auth" className="flex-1">
                Authentication
              </TabsTrigger>
              <TabsTrigger value="headers" className="flex-1">
                Headers
              </TabsTrigger>
            </TabsList>

            {/* ── Connection ─────────────────────────────────────────── */}
            <TabsContent value="connection" className="mt-4">
              <FieldGroup>
                <Field>
                  <Label htmlFor="agent-url">Agent URL</Label>
                  <Input
                    id="agent-url"
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://my-agent.example.com"
                    required
                    disabled={loading}
                  />
                </Field>
              </FieldGroup>
            </TabsContent>

            {/* ── Authentication ─────────────────────────────────────── */}
            <TabsContent value="auth" className="mt-4">
              <FieldGroup>
                <Field>
                  <Label>Auth Type</Label>
                  <Select
                    value={auth.type}
                    onValueChange={(v) =>
                      handleAuthTypeChange(v as AuthConfig["type"])
                    }
                    disabled={loading}
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
                      disabled={loading}
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
                        disabled={loading}
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
                        disabled={loading}
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
                        disabled={loading}
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
                        disabled={loading}
                      />
                    </Field>
                  </>
                )}
              </FieldGroup>
            </TabsContent>

            {/* ── Custom Headers ─────────────────────────────────────── */}
            <TabsContent value="headers" className="mt-4 flex flex-col gap-3">
              {headers.length === 0 && (
                <Muted>No custom headers. Add key-value pairs below.</Muted>
              )}
              {headers.map((row, i) => (
                <div key={i} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-center">
                  <Input
                    placeholder="Header name"
                    value={row.key}
                    onChange={(e) => updateHeader(i, "key", e.target.value)}
                    disabled={loading}
                    className="flex-1"
                  />
                  <Input
                    placeholder="Value"
                    value={row.value}
                    onChange={(e) => updateHeader(i, "value", e.target.value)}
                    disabled={loading}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeHeaderRow(i)}
                    disabled={loading}
                    aria-label="Remove header"
                  >
                    <Trash2Icon />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addHeaderRow}
                disabled={loading}
              >
                <PlusIcon data-icon="inline-start" />
                Add Header
              </Button>
            </TabsContent>
          </Tabs>

          {diagnostic && (
            <div className="mt-4 rounded-md border bg-muted/20 p-3">
              <div className="flex items-center justify-between gap-3">
                <Small>
                  {diagnostic.status === "checking"
                    ? "Checking connection"
                    : diagnostic.status === "connected"
                      ? "Agent card detected"
                      : "Connection failed"}
                </Small>
                <Badge
                  variant={
                    diagnostic.status === "connected"
                      ? "default"
                      : diagnostic.status === "error"
                        ? "destructive"
                        : "secondary"
                  }
                >
                  {diagnostic.status}
                </Badge>
              </div>
              <div className="mt-3 grid gap-1.5 text-xs text-muted-foreground">
                <div>
                  URL:{" "}
                  <span className="font-mono text-foreground">
                    {diagnostic.normalizedUrl ?? diagnostic.inputUrl}
                  </span>
                </div>
                <div>
                  Agent card:{" "}
                  <span className="font-mono text-foreground">
                    {diagnostic.attemptedCardUrl ?? "resolving..."}
                  </span>
                </div>
                {diagnostic.agentName && (
                  <div>
                    Agent: <span className="text-foreground">{diagnostic.agentName}</span>
                  </div>
                )}
                <div>
                  Transport:{" "}
                  <span className="text-foreground">
                    {diagnostic.transports.length > 0
                      ? diagnostic.transports.join(", ")
                      : "detecting..."}
                  </span>
                </div>
                <div>
                  Path:{" "}
                  <span className="text-foreground">{diagnostic.proxyPath ?? "detecting..."}</span>
                </div>
                <div>
                  Auth: <span className="text-foreground">{diagnostic.authSummary}</span>
                </div>
                <div>
                  Headers: <span className="text-foreground">{diagnostic.headerSummary}</span>
                </div>
                {diagnostic.latencyMs != null && (
                  <div>
                    Latency: <span className="text-foreground">{diagnostic.latencyMs} ms</span>
                  </div>
                )}
                {diagnostic.error && (
                  <Caption className="text-destructive">{diagnostic.error}</Caption>
                )}
              </div>
            </div>
          )}

          {error && <ErrorText className="mt-3">{error}</ErrorText>}

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Connecting…" : "Connect"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
