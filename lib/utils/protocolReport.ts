import type { Agent } from "@/lib/features/agents/agentsSlice";
import type { AgentCard } from "@a2a-js/sdk";
import type { Chat } from "@/lib/features/chats/chatsSlice";
import type { ExecutionEvent } from "@/lib/a2a/execution-events";
import type { ComplianceResult, ValidationWarning } from "@/lib/utils/compliance";
import { maskSecrets, type LogEntry } from "@/lib/utils/debugInterceptor";

export interface ProtocolReport {
  generatedAt: string;
  agent: {
    id: string;
    name: string;
    url: string;
    status: Agent["status"];
    card: AgentCard;
  };
  compliance: ComplianceResult;
  transportsDetected: string[];
  failedRequests: LogEntry[];
  validationWarnings: ValidationWarning[];
  debugLogCount: number;
  executionEventCount: number;
  executionEvents: ExecutionEvent[];
  chat?: {
    id: string;
    title: string;
    itemCount: number;
  };
}

export function buildProtocolReport(input: {
  agent: Agent;
  chat?: Chat;
  compliance: ComplianceResult;
  logs: LogEntry[];
  validationWarnings: ValidationWarning[];
}): ProtocolReport {
  const transportsDetected = Array.from(
    new Set(
      input.logs
        .map((log) => log.transport?.protocol ?? log.transport?.jsonRpcMethod ?? log.transport?.httpMethod)
        .filter((value): value is string => typeof value === "string" && value.length > 0)
    )
  );

  const failedRequests = input.logs.filter(
    (log) =>
      log.type === "error" ||
      (log.transport?.status != null && (log.transport.status < 200 || log.transport.status >= 400))
  );

  return maskSecrets({
    generatedAt: new Date().toISOString(),
    agent: {
      id: input.agent.id,
      name: input.agent.displayName ?? input.agent.card.name,
      url: input.agent.url,
      status: input.agent.status,
      card: input.agent.card,
    },
    compliance: input.compliance,
    transportsDetected,
    failedRequests,
    validationWarnings: input.validationWarnings,
    debugLogCount: input.logs.length,
    executionEventCount: input.chat?.executionEvents.length ?? 0,
    executionEvents: input.chat?.executionEvents ?? [],
    chat: input.chat
      ? {
          id: input.chat.id,
          title: input.chat.title,
          itemCount: input.chat.items.length,
        }
      : undefined,
  }) as ProtocolReport;
}

export function protocolReportFilename(name: string): string {
  return `${name.replace(/[^a-z0-9]/gi, "_")}_protocol_report.json`;
}
