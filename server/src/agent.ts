import {
  AgentExecutor,
  ExecutionEventBus,
  RequestContext,
} from "@a2a-js/sdk/server";

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

export const echoAgentExecutor: AgentExecutor = {
  async execute(requestContext: RequestContext, eventBus: ExecutionEventBus) {
    const { taskId, contextId, userMessage } = requestContext;
    const userText =
      userMessage.parts
        .filter((p) => p.kind === "text")
        .map((p) => (p as { kind: "text"; text: string }).text)
        .join(" ") || "(empty message)";

    // 1. TaskStatusUpdateEvent — task accepted, now working
    eventBus.publish({
      kind: "status-update",
      taskId,
      contextId,
      final: false,
      status: {
        state: "working",
        timestamp: new Date().toISOString(),
      },
    });
    await delay(300);

    // 2. TaskArtifactUpdateEvent — first chunk of a streamed text artifact
    const artifactId = crypto.randomUUID();
    eventBus.publish({
      kind: "artifact-update",
      taskId,
      contextId,
      append: false,
      lastChunk: false,
      artifact: {
        artifactId,
        name: "response",
        description: "Agent response artifact",
        parts: [{ kind: "text", text: `Echo: ${userText}` }],
      },
    });
    await delay(200);

    // 3. TaskArtifactUpdateEvent — second chunk appended to same artifact
    eventBus.publish({
      kind: "artifact-update",
      taskId,
      contextId,
      append: true,
      lastChunk: false,
      artifact: {
        artifactId,
        parts: [{ kind: "text", text: " (chunk 2)" }],
      },
    });
    await delay(200);

    // 4. TaskArtifactUpdateEvent — structured data artifact (e.g. JSON result)
    eventBus.publish({
      kind: "artifact-update",
      taskId,
      contextId,
      append: false,
      lastChunk: true,
      artifact: {
        artifactId: crypto.randomUUID(),
        name: "metadata",
        description: "Structured data about the response",
        parts: [
          {
            kind: "data",
            data: {
              originalMessage: userText,
              wordCount: userText.split(/\s+/).filter(Boolean).length,
              processedAt: new Date().toISOString(),
            },
          },
        ],
      },
    });
    await delay(200);

    // 5. Message — agent sends an inline message (not an artifact)
    eventBus.publish({
      kind: "message",
      messageId: crypto.randomUUID(),
      role: "agent",
      taskId,
      contextId,
      parts: [
        { kind: "text", text: `You said: "${userText}". Processing complete.` },
      ],
    });
    await delay(200);

    // 6. TaskStatusUpdateEvent — task completed (final=true closes the stream)
    eventBus.publish({
      kind: "status-update",
      taskId,
      contextId,
      final: true,
      status: {
        state: "completed",
        timestamp: new Date().toISOString(),
        message: {
          kind: "message",
          messageId: crypto.randomUUID(),
          role: "agent",
          parts: [{ kind: "text", text: "Task finished successfully." }],
        },
      },
    });

    eventBus.finished();
  },

  async cancelTask(taskId: string, eventBus: ExecutionEventBus) {
    // TaskStatusUpdateEvent — canceled state
    eventBus.publish({
      kind: "status-update",
      taskId,
      contextId: "",
      final: true,
      status: {
        state: "canceled",
        timestamp: new Date().toISOString(),
      },
    });
    eventBus.finished();
  },
};
