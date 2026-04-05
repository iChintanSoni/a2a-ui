import { type AgentExecutor, type ExecutionEventBus, RequestContext } from "@a2a-js/sdk/server";
import { type Part } from "@a2a-js/sdk";
import { createAgent, type ReactAgent } from "langchain";
import { MemorySaver } from "@langchain/langgraph";
import { ChatOllama } from "@langchain/ollama";
import { TavilySearch } from "@langchain/tavily";

const model = new ChatOllama({
  model: process.env.OLLAMA_MODEL || "qwen3.5:4b",
  baseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
  temperature: 0.7,
});

const checkpointer = new MemorySaver();

const tavilySearch = new TavilySearch({ maxResults: 3 });

const SYSTEM_PROMPT =
  "You are a helpful assistant. Use the search tool when you need up-to-date information. " +
  "At the end of every response that references any sources, facts, or search results, " +
  "include a '**References**' section with a numbered markdown list of links in the format: " +
  "1. [Title](URL). Only include this section when you have actual URLs to cite.";

const agent = createAgent({
  model,
  systemPrompt:
    SYSTEM_PROMPT +
    " When the user provides an image, describe and analyse it as part of your response.",
  checkpointer,
  tools: [tavilySearch],
});

// ─── Types ────────────────────────────────────────────────────────────────────

type ToolCall = { id: string; name: string; args: Record<string, unknown> };
type StepUpdate = { messages: Array<{ content: unknown; tool_calls?: ToolCall[]; tool_call_id?: string }> };

// LangChain multimodal content block types
type TextBlock = { type: "text"; text: string };
type ImageBlock = { type: "image_url"; image_url: { url: string } };
type ContentBlock = TextBlock | ImageBlock;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Convert A2A message parts into a LangChain content value.
 * - TextPart → plain string (or TextBlock in a multi-part message)
 * - FilePart with image/* MIME → ImageBlock (data URL or URI)
 * - Other FilePart → text placeholder so the model knows a file was attached
 * Returns a plain string when there is only a single text part (widest model compatibility),
 * otherwise returns a ContentBlock array for multimodal input.
 */
function buildMessageContent(parts: Part[]): string | ContentBlock[] {
  const blocks: ContentBlock[] = [];

  for (const part of parts) {
    if (part.kind === "text") {
      if (part.text) blocks.push({ type: "text", text: part.text });
    } else if (part.kind === "file") {
      const { file } = part;
      const mimeType = file.mimeType ?? "application/octet-stream";

      if (mimeType.startsWith("image/")) {
        const url =
          "uri" in file
            ? file.uri
            : `data:${mimeType};base64,${"bytes" in file ? file.bytes : ""}`;
        blocks.push({ type: "image_url", image_url: { url } });
      } else {
        // Non-image file — mention it as text so the model is aware
        const name = file.name ?? "file";
        blocks.push({
          type: "text",
          text: `[Attached file: ${name} (${mimeType}) — content not shown]`,
        });
      }
    }
  }

  if (blocks.length === 0) return "(empty message)";

  // Single text block → plain string for maximum model compatibility
  if (blocks.length === 1 && blocks[0].type === "text") return blocks[0].text;

  return blocks;
}

// ─── Stream handler (shared between text and vision agent) ────────────────────

async function streamAgentResponse(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  agentInstance: ReactAgent<any>,
  content: string | ContentBlock[],
  contextId: string,
  taskId: string,
  eventBus: ExecutionEventBus
) {
  const stream = await agentInstance.stream(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { messages: [{ role: "human", content }] } as any,
    { configurable: { thread_id: contextId }, streamMode: "updates" }
  );

  const toolQueryMap = new Map<string, string>();
  let responseText = "";

  for await (const chunk of stream) {
    const [step, update] = (Object.entries(chunk)[0] as unknown) as [string, StepUpdate];
    const messages = update.messages ?? [];
    const lastMsg = messages[messages.length - 1];

    if (step === "model_request" && lastMsg) {
      if (lastMsg.tool_calls?.length) {
        for (const tc of lastMsg.tool_calls) {
          const query =
            typeof tc.args?.query === "string" ? tc.args.query : JSON.stringify(tc.args);
          toolQueryMap.set(tc.id, query);
          eventBus.publish({
            kind: "artifact-update",
            taskId,
            contextId,
            append: false,
            lastChunk: false,
            artifact: {
              artifactId: tc.id,
              name: "tool-call",
              parts: [{ kind: "data", data: { phase: "running", toolName: tc.name, query } }],
            },
          });
        }
      } else if (typeof lastMsg.content === "string" && lastMsg.content) {
        responseText = lastMsg.content;
      }
    } else if (step === "tools") {
      for (const msg of messages) {
        if (!msg.tool_call_id) continue;
        const query = toolQueryMap.get(msg.tool_call_id) ?? "";
        toolQueryMap.delete(msg.tool_call_id);
        let resultCount = 0;
        try {
          const parsed = JSON.parse(
            typeof msg.content === "string" ? msg.content : ""
          ) as Record<string, unknown>;
          const results = Array.isArray(parsed) ? parsed : parsed.results;
          resultCount = Array.isArray(results) ? results.length : 0;
        } catch {
          // non-JSON content
        }
        eventBus.publish({
          kind: "artifact-update",
          taskId,
          contextId,
          append: false,
          lastChunk: true,
          artifact: {
            artifactId: msg.tool_call_id,
            name: "tool-call",
            parts: [
              {
                kind: "data",
                data: { phase: "done", toolName: "tavily_search", query, resultCount },
              },
            ],
          },
        });
      }
    }
  }

  return responseText;
}

// ─── Agent executor ───────────────────────────────────────────────────────────

export const chatAgentExecutor: AgentExecutor = {
  async execute(requestContext: RequestContext, eventBus: ExecutionEventBus) {
    const { taskId, contextId, userMessage } = requestContext;

    // Build multimodal content from all message parts
    const content = buildMessageContent(userMessage.parts as Part[]);

    eventBus.publish({
      kind: "status-update",
      taskId,
      contextId,
      final: false,
      status: { state: "working", timestamp: new Date().toISOString() },
    });

    try {
      const responseText = await streamAgentResponse(
        agent,
        content,
        contextId,
        taskId,
        eventBus
      );

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
            parts: [
              {
                kind: "text",
                text: `Error: ${error instanceof Error ? error.message : String(error)}`,
              },
            ],
          },
        },
      });
    }

    eventBus.finished();
  },

  async cancelTask(taskId: string, eventBus: ExecutionEventBus) {
    eventBus.publish({
      kind: "status-update",
      taskId,
      contextId: "",
      final: true,
      status: { state: "canceled", timestamp: new Date().toISOString() },
    });
    eventBus.finished();
  },
};
