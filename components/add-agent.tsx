"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { useAppDispatch } from "@/lib/hooks";
import { addAgent, type AuthConfig, type CustomHeader } from "@/lib/features/agents/agentsSlice";
import { createClientFactory } from "@/lib/utils/auth";
import { normalizeAgentUrl, getAgentCardUrlFallback } from "@/lib/utils/url";
import { type Client } from "@a2a-js/sdk/client";
import { Button } from "@/components/ui/button";
import { Muted, ErrorText } from "@/components/typography";
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

export function AddAgent() {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("http://localhost:3001");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
  };

  const handleOpenChange = (val: boolean) => {
    setOpen(val);
    if (!val) resetForm();
  };

  const handleAddAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const normalizedUrl = normalizeAgentUrl(url);
      const factory = createClientFactory(auth, headers);

      let client: Client;
      let finalUrl = normalizedUrl;

      try {
        client = await factory.createFromUrl(normalizedUrl);
      } catch (err) {
        // If normalization changed nothing or already ended in .json, don't fallback
        const fallbackUrl = getAgentCardUrlFallback(normalizedUrl);
        if (fallbackUrl && fallbackUrl !== normalizedUrl) {
          try {
            client = await factory.createFromUrl(fallbackUrl);
            finalUrl = fallbackUrl;
          } catch {
            // If fallback also fails, throw the original error
            throw err;
          }
        } else {
          throw err;
        }
      }

      const card = await client.getAgentCard();

      dispatch(
        addAgent({
          id: crypto.randomUUID(),
          url: finalUrl,
          card,
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
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">Add Agent</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleAddAgent}>
          <DialogHeader>
            <DialogTitle>Add Agent</DialogTitle>
            <DialogDescription>
              Connect to an A2A-compatible agent by URL.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="connection" className="mt-4">
            <TabsList className="w-full">
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
            <TabsContent value="auth" className="mt-4 space-y-4">
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
            <TabsContent value="headers" className="mt-4 space-y-3">
              {headers.length === 0 && (
                <Muted>No custom headers. Add key-value pairs below.</Muted>
              )}
              {headers.map((row, i) => (
                <div key={i} className="flex items-center gap-2">
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
                    <Trash2Icon className="size-4" />
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
                <PlusIcon className="size-4" />
                Add Header
              </Button>
            </TabsContent>
          </Tabs>

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
