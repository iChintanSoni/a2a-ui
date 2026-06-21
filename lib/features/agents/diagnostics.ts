import type { AgentCard } from "@a2a-js/sdk";
import type { Client } from "@a2a-js/sdk/client";
import type { AuthConfig, CustomHeader } from "@/lib/features/agents/agentsSlice";
import { createClientFactory } from "@/lib/utils/auth";
import { getAgentCardUrlFallback, normalizeAgentUrl } from "@/lib/utils/url";
import { getErrorMessage } from "@/lib/utils/error";

export interface AgentConnectionDiagnostic {
  status: "checking" | "connected" | "error";
  inputUrl: string;
  normalizedUrl?: string;
  attemptedCardUrl?: string;
  finalUrl?: string;
  agentName?: string;
  preferredTransport?: string;
  transports: string[];
  latencyMs?: number;
  proxyPath?: "direct" | "same-origin proxy";
  authSummary: string;
  headerSummary: string;
  error?: string;
}

export interface AgentConnectionDiagnosticResult {
  diagnostic: AgentConnectionDiagnostic;
  client?: Client;
  card?: AgentCard;
  finalUrl?: string;
}

export function summarizeAuth(auth: AuthConfig): string {
  switch (auth.type) {
    case "bearer":
      return auth.bearerToken ? "Bearer token configured" : "Bearer token selected";
    case "api-key":
      return auth.apiKeyHeader
        ? `API key header ${auth.apiKeyHeader}`
        : "API key selected";
    case "basic":
      return auth.basicUsername ? `Basic auth for ${auth.basicUsername}` : "Basic auth selected";
    case "none":
    default:
      return "No authentication";
  }
}

export function summarizeHeaders(headers: CustomHeader[]): string {
  const configured = headers.filter((header) => header.key.trim());
  if (configured.length === 0) return "No custom headers";
  return configured
    .map((header) => `${header.key.trim()}: ${header.value ? "configured" : "empty"}`)
    .join(", ");
}

function proxyPathFor(url: string): AgentConnectionDiagnostic["proxyPath"] {
  if (typeof window === "undefined") return "direct";
  try {
    return new URL(url).origin === window.location.origin ? "direct" : "same-origin proxy";
  } catch {
    return "direct";
  }
}

export async function runAgentConnectionDiagnostic({
  url,
  auth,
  headers,
  a2uiEnabled = false,
}: {
  url: string;
  auth: AuthConfig;
  headers: CustomHeader[];
  a2uiEnabled?: boolean;
}): Promise<AgentConnectionDiagnosticResult> {
  const startedAt = Date.now();
  const authSummary = summarizeAuth(auth);
  const headerSummary = summarizeHeaders(headers);
  let normalizedUrl: string | undefined;
  let attemptedCardUrl: string | undefined;
  let finalUrl: string | undefined;

  try {
    normalizedUrl = normalizeAgentUrl(url);
    attemptedCardUrl = getAgentCardUrlFallback(normalizedUrl);
    finalUrl = normalizedUrl;

    const factory = createClientFactory(auth, headers, undefined, undefined, { a2uiEnabled });
    let client: Client;

    try {
      client = await factory.createFromUrl(normalizedUrl);
    } catch (err) {
      if (attemptedCardUrl && attemptedCardUrl !== normalizedUrl) {
        try {
          client = await factory.createFromUrl(attemptedCardUrl);
          finalUrl = attemptedCardUrl;
        } catch {
          throw err;
        }
      } else {
        throw err;
      }
    }

    const card = await Promise.race([
      client.getAgentCard(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Agent card fetch timed out after 15s")), 15_000)
      ),
    ]);
    const interfaces = card.additionalInterfaces ?? [];
    const transports = Array.from(
      new Set(
        [
          card.preferredTransport,
          ...interfaces.map((entry) => entry.transport),
        ].filter((entry): entry is string => Boolean(entry)),
      ),
    );

    const diagnostic: AgentConnectionDiagnostic = {
      status: "connected",
      inputUrl: url,
      normalizedUrl,
      attemptedCardUrl,
      finalUrl,
      agentName: card.name,
      preferredTransport: card.preferredTransport,
      transports,
      latencyMs: Date.now() - startedAt,
      proxyPath: proxyPathFor(attemptedCardUrl ?? normalizedUrl ?? url),
      authSummary,
      headerSummary,
    };

    return { diagnostic, client, card, finalUrl };
  } catch (err) {
    return {
      diagnostic: {
        status: "error",
        inputUrl: url,
        normalizedUrl,
        attemptedCardUrl,
        finalUrl,
        transports: [],
        latencyMs: Date.now() - startedAt,
        proxyPath: attemptedCardUrl ? proxyPathFor(attemptedCardUrl) : undefined,
        authSummary,
        headerSummary,
        error: getErrorMessage(err, "Failed to connect. Check the URL and try again."),
      },
    };
  }
}
