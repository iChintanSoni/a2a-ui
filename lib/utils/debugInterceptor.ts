import type { CallInterceptor, BeforeArgs, AfterArgs } from "@a2a-js/sdk/client";

export type LogType = "request" | "response" | "error";

export interface LogEntry {
  id: string;
  timestamp: number;
  type: LogType;
  /** Client method name, e.g. "sendMessageStream", "getTask" */
  method: string;
  payload: unknown;
}

const MAX_LOGS = 500;

export function appendLog(prev: LogEntry[], entry: LogEntry): LogEntry[] {
  const next = [...prev, entry];
  return next.length > MAX_LOGS ? next.slice(next.length - MAX_LOGS) : next;
}

export class DebugInterceptor implements CallInterceptor {
  constructor(private readonly onLog: (entry: LogEntry) => void) {}

  async before(args: BeforeArgs): Promise<void> {
    if (!args.input) return;
    this.onLog({
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      type: "request",
      method: String(args.input.method),
      payload: (args.input as { value?: unknown }).value ?? null,
    });
  }

  async after(args: AfterArgs): Promise<void> {
    if (!args.result) return;
    this.onLog({
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      type: "response",
      method: String(args.result.method),
      payload: (args.result as { value?: unknown }).value ?? null,
    });
  }
}
