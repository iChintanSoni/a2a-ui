import type { AuthConfig, CustomHeader } from "@/lib/features/agents/agentsSlice";
import { createDebugFetch, type LogEntry } from "@/lib/utils/debugInterceptor";
import {
  ClientFactory,
  ClientFactoryOptions,
  JsonRpcTransportFactory,
  RestTransportFactory,
  DefaultAgentCardResolver,
  type CallInterceptor,
} from "@a2a-js/sdk/client";

function isHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function shouldProxyRequest(targetUrl: string): boolean {
  if (typeof window === "undefined") return false;
  if (!isHttpUrl(targetUrl)) return false;

  try {
    return new URL(targetUrl).origin !== window.location.origin;
  } catch {
    return false;
  }
}

/** Compute the HTTP headers that correspond to an auth config + custom headers. */
export function buildRequestHeaders(
  auth: AuthConfig,
  customHeaders: CustomHeader[]
): Record<string, string> {
  const headers: Record<string, string> = {};

  switch (auth.type) {
    case "bearer":
      if (auth.bearerToken) {
        headers["Authorization"] = `Bearer ${auth.bearerToken}`;
      }
      break;
    case "api-key":
      if (auth.apiKeyHeader && auth.apiKeyValue) {
        headers[auth.apiKeyHeader] = auth.apiKeyValue;
      }
      break;
    case "basic":
      if (auth.basicUsername || auth.basicPassword) {
        const encoded = btoa(
          `${auth.basicUsername ?? ""}:${auth.basicPassword ?? ""}`
        );
        headers["Authorization"] = `Basic ${encoded}`;
      }
      break;
  }

  for (const h of customHeaders) {
    if (h.key.trim()) {
      headers[h.key.trim()] = h.value;
    }
  }

  return headers;
}

/** Wrap the global fetch to always inject the given headers. */
function createFetchWithHeaders(
  extraHeaders: Record<string, string>,
  onLog?: (entry: LogEntry) => void
): typeof fetch {
  const observedFetch = onLog ? createDebugFetch(fetch, onLog) : fetch;

  return async (input, init) => {
    const request = input instanceof Request ? input : new Request(input, init);
    const headers = new Headers(request.headers);
    for (const [key, value] of Object.entries(extraHeaders)) {
      headers.set(key, value);
    }

    const body =
      request.method === "GET" || request.method === "HEAD"
        ? undefined
        : await request.clone().arrayBuffer();

    const targetUrl = request.url;
    const proxyUrl =
      shouldProxyRequest(targetUrl) && typeof window !== "undefined"
        ? new URL("/api/proxy", window.location.origin)
        : null;
    if (proxyUrl) {
      proxyUrl.searchParams.set("url", targetUrl);
      return observedFetch(proxyUrl, {
        method: request.method,
        headers,
        body,
        signal: request.signal,
      });
    }

    return observedFetch(request.url, {
      method: request.method,
      headers,
      body,
      signal: request.signal,
    });
  };
}

/** Build a ClientFactory that injects auth + custom headers into every request. */
export function createClientFactory(
  auth: AuthConfig,
  customHeaders: CustomHeader[],
  interceptors?: CallInterceptor[],
  onTransportLog?: (entry: LogEntry) => void
): ClientFactory {
  const extraHeaders = buildRequestHeaders(auth, customHeaders);
  const clientConfig =
    interceptors && interceptors.length > 0 ? { interceptors } : undefined;

  const fetchImpl = createFetchWithHeaders(extraHeaders, onTransportLog);
  return new ClientFactory(
    ClientFactoryOptions.createFrom(ClientFactoryOptions.default, {
      transports: [
        new JsonRpcTransportFactory({ fetchImpl }),
        new RestTransportFactory({ fetchImpl }),
      ],
      cardResolver: new DefaultAgentCardResolver({ fetchImpl }),
      ...(clientConfig ? { clientConfig } : {}),
    })
  );
}
