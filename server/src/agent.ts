import { type AgentExecutor, type ExecutionEventBus, RequestContext } from "@a2a-js/sdk/server";
import { type Part } from "@a2a-js/sdk";
import { type ReactAgent } from "langchain";
import { z } from "zod";
import { agent } from "#src/agentTools.ts";
import { buildMessageContent, contentToText, shouldReturnA2UIDemo, type ContentBlock } from "#src/contentBuilder.ts";
import { publishToolCallEvent, publishA2UIDemo } from "#src/eventPublisher.ts";

// ── Leveled logger ───────────────────────────────────────────────────────────

const LOG_LEVEL = (process.env.LOG_LEVEL ?? "info").toLowerCase();

function log(message: string, ...args: unknown[]): void {
  if (LOG_LEVEL !== "silent") console.log(message, ...args);
}

function debug(message: string, ...args: unknown[]): void {
  if (LOG_LEVEL === "debug") console.log(message, ...args);
}

// ─── Types ────────────────────────────────────────────────────────────────────

type ToolCall = { id: string; name: string; args: Record<string, unknown> };
type StepUpdate = {
  messages: Array<{
    content: unknown;
    tool_calls?: ToolCall[];
    tool_call_id?: string;
    usage_metadata?: Record<string, unknown>;
  }>;
};

// ─── Constants ────────────────────────────────────────────────────────────────

/** Max characters logged from tool output to avoid flooding the console. */
const TOOL_LOG_PREVIEW_CHARS = 200;

/** Reject messages whose combined text exceeds this limit to protect the LLM from OOM. */
const MAX_INPUT_CHARS = 32_000;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isAbortError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return error.name === "AbortError" || error.message.includes("AbortError") || error.message.includes("aborted");
}

// ─── Stream handler ───────────────────────────────────────────────────────────

async function streamAgentResponse(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  agentInstance: ReactAgent<any>,
  content: string | ContentBlock[],
  contextId: string,
  taskId: string,
  eventBus: ExecutionEventBus,
  signal?: AbortSignal
) {
  const stream = await agentInstance.stream(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { messages: [{ role: "human", content }] } as any,
    { configurable: { thread_id: contextId }, streamMode: "updates", signal },
  );

  const toolQueryMap = new Map<string, { toolName: string; query: string }>();
  let responseText = "";
  let usageMetadata: Record<string, unknown> | undefined;

  for await (const chunk of stream) {
    const [step, update] = Object.entries(chunk)[0] as unknown as [string, StepUpdate];
    const messages = update.messages ?? [];
    const lastMsg = messages[messages.length - 1];

    if (step !== "tools" && lastMsg) {
      if (lastMsg.tool_calls?.length) {
        for (const tc of lastMsg.tool_calls) {
          const query = typeof tc.args?.query === "string" ? tc.args.query : JSON.stringify(tc.args);
          toolQueryMap.set(tc.id, { toolName: tc.name, query });
          log(`[Tool Call] ${tc.name} executing with args:`, query);
          publishToolCallEvent(eventBus, { taskId, contextId, artifactId: tc.id, phase: "running", toolName: tc.name, query });
        }
      } else {
        const text = contentToText(lastMsg.content);
        if (text) responseText = text;
      }

      if (lastMsg.usage_metadata) {
        usageMetadata = lastMsg.usage_metadata;
        debug(`[Observatory - Token Usage]`, lastMsg.usage_metadata);
      }
    } else if (step === "tools") {
      for (const msg of messages) {
        if (!msg.tool_call_id) continue;
        const { toolName: resolvedToolName, query } = toolQueryMap.get(msg.tool_call_id) ?? { toolName: "unknown", query: "" };
        toolQueryMap.delete(msg.tool_call_id);

        const rawContent = typeof msg.content === "string" ? msg.content : "";
        debug(
          `[Tool Result] ${resolvedToolName}:`,
          rawContent.substring(0, TOOL_LOG_PREVIEW_CHARS) + (rawContent.length > TOOL_LOG_PREVIEW_CHARS ? "..." : "")
        );

        if (resolvedToolName === "generate_image") {
          let imageToolError: string | undefined;
          try {
            const imageResultSchema = z.object({
              success: z.boolean(),
              image_base64: z.string().optional(),
              mimeType: z.string().optional(),
              error: z.string().optional(),
            });
            const parsed = imageResultSchema.parse(JSON.parse(rawContent));
            if (parsed.success && parsed.image_base64) {
              const mimeType = parsed.mimeType ?? "image/png";
              const ext = mimeType.split("/")[1] ?? "png";
              publishToolCallEvent(eventBus, { taskId, contextId, artifactId: msg.tool_call_id, phase: "done", toolName: resolvedToolName, query, resultCount: 1 });
              eventBus.publish({
                kind: "artifact-update",
                taskId,
                contextId,
                append: false,
                lastChunk: true,
                artifact: {
                  artifactId: crypto.randomUUID(),
                  name: "generated-image",
                  description: `Generated image for: ${query}`,
                  parts: [{ kind: "file", file: { name: `generated-image.${ext}`, mimeType, bytes: parsed.image_base64 } }],
                },
              });
            } else {
              imageToolError = parsed.error ?? "Image generation failed without an error message.";
            }
          } catch (error) {
            imageToolError = error instanceof Error ? `Unable to parse image tool result: ${error.message}` : String(error);
          }
          if (imageToolError) {
            publishToolCallEvent(eventBus, { taskId, contextId, artifactId: msg.tool_call_id, phase: "error", toolName: resolvedToolName, query, error: imageToolError });
          }
          continue;
        }

        let resultCount = 0;
        try {
          const parsed: unknown = JSON.parse(rawContent);
          const results = Array.isArray(parsed)
            ? parsed
            : (typeof parsed === "object" && parsed !== null && "results" in parsed)
              ? (parsed as { results: unknown }).results
              : undefined;
          resultCount = Array.isArray(results) ? results.length : 0;
        } catch {
          // non-JSON content — resultCount stays 0
        }
        publishToolCallEvent(eventBus, { taskId, contextId, artifactId: msg.tool_call_id, phase: "done", toolName: resolvedToolName, query, resultCount });
      }
    }
  }

  return { responseText, usageMetadata };
}

// ─── Agent executor ───────────────────────────────────────────────────────────

const activeAbortControllers = new Map<string, AbortController>();
const activeContextIds = new Map<string, string>();
const activeCancelledTasks = new Set<string>();

export const chatAgentExecutor: AgentExecutor = {
  async execute(requestContext: RequestContext, eventBus: ExecutionEventBus) {
    const { taskId, contextId, userMessage } = requestContext;

    log(`\n--- [Task Initiated] Context ID: ${contextId} | Task ID: ${taskId} ---`);
    debug(`[Input]`, JSON.stringify(userMessage.parts, null, 2));

    const totalInputChars = (userMessage.parts as Part[]).reduce((sum, part) => {
      if (part.kind === "text") return sum + part.text.length;
      if (part.kind === "data") return sum + JSON.stringify(part.data).length;
      return sum;
    }, 0);

    if (totalInputChars > MAX_INPUT_CHARS) {
      eventBus.publish({
        kind: "status-update",
        taskId,
        contextId,
        final: true,
        status: {
          state: "failed",
          timestamp: new Date().toISOString(),
          message: {
            kind: "message",
            messageId: crypto.randomUUID(),
            role: "agent",
            parts: [{ kind: "text", text: `Input too large (${totalInputChars.toLocaleString()} characters). Please shorten your message and try again.` }],
          },
        },
      });
      eventBus.finished();
      return;
    }

    const content = buildMessageContent(userMessage.parts as Part[]);

    eventBus.publish({
      kind: "status-update",
      taskId,
      contextId,
      final: false,
      status: { state: "working", timestamp: new Date().toISOString() },
    });

    const abortController = new AbortController();
    activeAbortControllers.set(taskId, abortController);
    activeContextIds.set(taskId, contextId);

    try {
      if (shouldReturnA2UIDemo(content)) {
        publishA2UIDemo(eventBus, taskId, contextId);
        eventBus.publish({
          kind: "status-update",
          taskId,
          contextId,
          final: true,
          status: { state: "completed", timestamp: new Date().toISOString() },
        });
        eventBus.finished();
        return;
      }

      const result = await streamAgentResponse(agent, content, contextId, taskId, eventBus, abortController.signal);
      let responseText = result.responseText;
      const { usageMetadata } = result;

      if (!responseText) responseText = "The agent completed the task without returning text.";

      debug(`[Final Response]`, responseText);
      log(`--- [Task Complete] Context ID: ${contextId} | Task ID: ${taskId} ---\n`);

      eventBus.publish({
        kind: "artifact-update",
        taskId,
        contextId,
        append: false,
        lastChunk: true,
        artifact: {
          artifactId: crypto.randomUUID(),
          name: "response",
          description: "Agent response",
          parts: [{ kind: "text", text: responseText }],
          metadata: usageMetadata ? { usage: usageMetadata } : undefined,
        },
      });

      eventBus.publish({
        kind: "status-update",
        taskId,
        contextId,
        final: true,
        status: { state: "completed", timestamp: new Date().toISOString() },
      });
    } catch (error) {
      if (activeCancelledTasks.has(taskId) || isAbortError(error)) {
        log(`--- [Task Canceled] Context ID: ${contextId} | Task ID: ${taskId} ---\n`);
        return;
      }
      console.error(`[Task Failed] Context ID: ${contextId} | Task ID: ${taskId}`, error);
      eventBus.publish({
        kind: "status-update",
        taskId,
        contextId,
        final: true,
        status: {
          state: "failed",
          timestamp: new Date().toISOString(),
          message: {
            kind: "message",
            messageId: crypto.randomUUID(),
            role: "agent",
            parts: [{ kind: "text", text: "An error occurred while processing your request. Please try again." }],
          },
        },
      });
    } finally {
      activeAbortControllers.delete(taskId);
      activeContextIds.delete(taskId);
      activeCancelledTasks.delete(taskId);
    }

    eventBus.finished();
  },

  async cancelTask(taskId: string, eventBus: ExecutionEventBus) {
    const controller = activeAbortControllers.get(taskId);
    activeCancelledTasks.add(taskId);
    if (controller) controller.abort();

    eventBus.publish({
      kind: "status-update",
      taskId,
      contextId: activeContextIds.get(taskId) ?? taskId,
      final: true,
      status: { state: "canceled", timestamp: new Date().toISOString() },
    });
    eventBus.finished();
    if (!controller) activeCancelledTasks.delete(taskId);
  },
};
