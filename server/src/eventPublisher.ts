import { type ExecutionEventBus } from "@a2a-js/sdk/server";

export function publishToolCallEvent(
  eventBus: ExecutionEventBus,
  params: {
    taskId: string;
    contextId: string;
    artifactId: string;
    phase: "running" | "done" | "error";
    toolName: string;
    query: string;
    resultCount?: number;
    error?: string;
  },
) {
  eventBus.publish({
    kind: "artifact-update",
    taskId: params.taskId,
    contextId: params.contextId,
    append: false,
    lastChunk: params.phase !== "running",
    artifact: {
      artifactId: params.artifactId,
      name: "tool-call",
      parts: [
        {
          kind: "data",
          data: {
            phase: params.phase,
            toolName: params.toolName,
            query: params.query,
            ...(params.resultCount != null ? { resultCount: params.resultCount } : {}),
            ...(params.error ? { error: params.error } : {}),
          },
        },
      ],
    },
  });
}

export function publishA2UIDemo(eventBus: ExecutionEventBus, taskId: string, contextId: string) {
  eventBus.publish({
    kind: "artifact-update",
    taskId,
    contextId,
    append: false,
    lastChunk: true,
    artifact: {
      artifactId: crypto.randomUUID(),
      name: "a2ui-demo",
      description: "Read-only A2UI fixture",
      parts: [
        {
          kind: "data",
          data: {
            a2ui: {
              kind: "surface",
              version: "1",
              title: "Deployment Readiness",
              description: "Demo structured surface emitted by the local A2A server.",
              components: [
                { kind: "badge", label: "Ready", tone: "success" },
                {
                  kind: "key-value",
                  items: [
                    { label: "Environment", value: "local" },
                    { label: "Checks passed", value: 6 },
                    { label: "Approval required", value: false },
                  ],
                },
                {
                  kind: "table",
                  columns: [
                    { key: "check", label: "Check" },
                    { key: "status", label: "Status" },
                  ],
                  rows: [
                    { check: "Agent card", status: "ok" },
                    { check: "Streaming", status: "ok" },
                    { check: "Renderer", status: "read-only" },
                  ],
                },
                {
                  kind: "markdown",
                  markdown: "This fixture intentionally avoids executable code and only renders a constrained component subset.",
                },
              ],
            },
          },
          metadata: { mimeType: "application/vnd.a2ui+json" },
        },
      ],
      metadata: {
        a2ui: { version: "1", mode: "read-only" },
      },
    },
  });
}
