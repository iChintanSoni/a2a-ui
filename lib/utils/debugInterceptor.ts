import type { CallInterceptor, BeforeArgs, AfterArgs } from "@a2a-js/sdk/client";

export type LogType = "request" | "response" | "error" | "transport" | "validation";

export interface TransportInfo {
  protocol?: string | null;
  httpMethod?: string;
  url?: string;
  status?: number;
  statusText?: string;
  durationMs?: number;
  requestHeaders?: Record<string, string>;
  responseHeaders?: Record<string, string>;
  jsonRpcId?: string | number | null;
  jsonRpcMethod?: string;
}

export interface LogEntry {
  id: string;
  timestamp: number;
  type: LogType;
  /** Client method name, e.g. "sendMessageStream", "getTask" */
  method: string;
  payload: unknown;
  transport?: TransportInfo;
}

const MAX_LOGS = 500;
const SECRET_HEADER_NAMES = [
  "authorization",
  "cookie",
  "set-cookie",
  "x-api-key",
  "api-key",
  "apikey",
  "proxy-authorization",
];

export function appendLog(prev: LogEntry[], entry: LogEntry): LogEntry[] {
  const next = [...prev, entry];
  return next.length > MAX_LOGS ? next.slice(next.length - MAX_LOGS) : next;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function normalizeHeaders(headers: HeadersInit | undefined): Record<string, string> {
  if (!headers) return {};
  if (headers instanceof Headers) return Object.fromEntries(headers.entries());
  if (Array.isArray(headers)) return Object.fromEntries(headers);
  return headers;
}

export function maskHeaders(headers: HeadersInit | undefined): Record<string, string> {
  return Object.fromEntries(
    Object.entries(normalizeHeaders(headers)).map(([key, value]) => {
      const lower = key.toLowerCase();
      const secret =
        SECRET_HEADER_NAMES.includes(lower) ||
        lower.includes("token") ||
        lower.includes("secret") ||
        lower.includes("password");
      return [key, secret ? "********" : String(value)];
    })
  );
}

export function maskSecrets(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(maskSecrets);
  if (!isRecord(value)) return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => {
      const lower = key.toLowerCase();
      const secret =
        SECRET_HEADER_NAMES.includes(lower) ||
        lower.includes("token") ||
        lower.includes("secret") ||
        lower.includes("password") ||
        lower.includes("apikey") ||
        lower.includes("api-key");
      return [key, secret ? "********" : maskSecrets(entry)];
    })
  );
}

function tryParseJsonRpc(body: unknown): Pick<TransportInfo, "jsonRpcId" | "jsonRpcMethod"> {
  if (typeof body !== "string") return {};
  try {
    const parsed = JSON.parse(body) as unknown;
    if (!isRecord(parsed)) return {};
    return {
      jsonRpcId:
        typeof parsed.id === "string" || typeof parsed.id === "number" || parsed.id === null
          ? parsed.id
          : undefined,
      jsonRpcMethod: typeof parsed.method === "string" ? parsed.method : undefined,
    };
  } catch {
    return {};
  }
}

function headersFromResponse(response: Response): Record<string, string> {
  return Object.fromEntries(response.headers.entries());
}

export function createDebugFetch(
  baseFetch: typeof fetch,
  onLog: (entry: LogEntry) => void
): typeof fetch {
  return async (input, init) => {
    const startedAt = performance.now();
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const httpMethod =
      init?.method ??
      (typeof input === "object" && "method" in input ? input.method : undefined) ??
      "GET";
    const requestHeaders = maskHeaders(init?.headers);
    const jsonRpc = tryParseJsonRpc(init?.body);

    try {
      const response = await baseFetch(input, init);
      onLog({
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        type: "transport",
        method: jsonRpc.jsonRpcMethod ?? httpMethod,
        payload: {
          ok: response.ok,
          status: response.status,
          statusText: response.statusText,
        },
        transport: {
          httpMethod,
          url,
          status: response.status,
          statusText: response.statusText,
          durationMs: Math.round(performance.now() - startedAt),
          requestHeaders,
          responseHeaders: maskHeaders(headersFromResponse(response)),
          ...jsonRpc,
        },
      });
      return response;
    } catch (err) {
      onLog({
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        type: "transport",
        method: jsonRpc.jsonRpcMethod ?? httpMethod,
        payload: {
          error: err instanceof Error ? err.message : "Transport request failed",
        },
        transport: {
          httpMethod,
          url,
          durationMs: Math.round(performance.now() - startedAt),
          requestHeaders,
          ...jsonRpc,
        },
      });
      throw err;
    }
  };
}

export class DebugInterceptor implements CallInterceptor {
  private readonly pendingStarts = new Map<string, number[]>();

  constructor(private readonly onLog: (entry: LogEntry) => void) {}

  async before(args: BeforeArgs): Promise<void> {
    if (!args.input) return;
    const method = String(args.input.method);
    const starts = this.pendingStarts.get(method) ?? [];
    starts.push(performance.now());
    this.pendingStarts.set(method, starts);
    this.onLog({
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      type: "request",
      method,
      payload: maskSecrets((args.input as { value?: unknown }).value ?? null),
    });
  }

  async after(args: AfterArgs): Promise<void> {
    if (!args.result) return;
    const method = String(args.result.method);
    const startedAt = this.pendingStarts.get(method)?.shift();
    this.onLog({
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      type: "response",
      method,
      payload: maskSecrets((args.result as { value?: unknown }).value ?? null),
      transport: {
        durationMs:
          typeof startedAt === "number"
            ? Math.round(performance.now() - startedAt)
            : undefined,
      },
    });
  }
}
