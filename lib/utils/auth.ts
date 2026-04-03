import type { AuthConfig, CustomHeader } from "@/lib/features/agents/agentsSlice";
import {
  ClientFactory,
  ClientFactoryOptions,
  JsonRpcTransportFactory,
  RestTransportFactory,
  DefaultAgentCardResolver,
} from "@a2a-js/sdk/client";

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
  extraHeaders: Record<string, string>
): typeof fetch {
  return (input, init) =>
    fetch(input, {
      ...init,
      headers: { ...(init?.headers as Record<string, string>), ...extraHeaders },
    });
}

/** Build a ClientFactory that injects auth + custom headers into every request. */
export function createClientFactory(
  auth: AuthConfig,
  customHeaders: CustomHeader[]
): ClientFactory {
  const extraHeaders = buildRequestHeaders(auth, customHeaders);
  const hasHeaders = Object.keys(extraHeaders).length > 0;

  if (!hasHeaders) {
    return new ClientFactory();
  }

  const fetchImpl = createFetchWithHeaders(extraHeaders);
  return new ClientFactory(
    ClientFactoryOptions.createFrom(ClientFactoryOptions.default, {
      transports: [
        new JsonRpcTransportFactory({ fetchImpl }),
        new RestTransportFactory({ fetchImpl }),
      ],
      cardResolver: new DefaultAgentCardResolver({ fetchImpl }),
    })
  );
}
