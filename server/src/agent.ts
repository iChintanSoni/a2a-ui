import { type AgentExecutor, type ExecutionEventBus, RequestContext } from "@a2a-js/sdk/server";
import { type Part } from "@a2a-js/sdk";
import { createAgent, type ReactAgent } from "langchain";
import { MemorySaver } from "@langchain/langgraph";
import { TavilySearch } from "@langchain/tavily";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { ChatGoogle } from "@langchain/google/node";

const model = new ChatGoogle({
  model: process.env.GEMINI_LLM_MODEL || "gemini-2.5-flash",
  apiKey: process.env.GEMINI_API_KEY,
  temperature: 0.7,
});

const imageModel = new ChatGoogle({
  model: process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image",
  apiKey: process.env.GEMINI_API_KEY,
  temperature: 0.5,
  responseModalities: ["IMAGE", "TEXT"],
});

const checkpointer = new MemorySaver();

const tavilySearch = new TavilySearch({ maxResults: 3 });

const generateImageTool = new DynamicStructuredTool({
  name: "generate_image",
  description:
    "Generate an image from a text prompt using AI. Use this when the user asks to create, draw, render, or generate an image.",
  schema: z.object({
    prompt: z.string().describe("The text description of the image to generate"),
  }),
  func: async ({ prompt }) => {
    const res = await imageModel.invoke(prompt);

    for (const block of res.contentBlocks ?? []) {
      if (block.type === "file" && block.data) {
        const mimeType = ((block.mimeType as string) || "image/png").split(";")[0];
        return JSON.stringify({ success: true, image_base64: block.data, mimeType });
      }
    }

    return JSON.stringify({ success: false, error: "No image returned by model" });
  },
});

const SYSTEM_PROMPT =
  "You are a helpful assistant. Use the search tool when you need up-to-date information. " +
  "At the end of every response that references any sources, facts, or search results, " +
  "include a '**References**' section with a numbered markdown list of links in the format: " +
  "1. [Title](URL). Only include this section when you have actual URLs to cite. " +
  "When the user asks to generate or create an image, use the generate_image tool.";

const agent = createAgent({
  model,
  systemPrompt:
    SYSTEM_PROMPT +
    " When the user provides an image, describe and analyse it as part of your response.",
  checkpointer,
  tools: [tavilySearch, generateImageTool],
});

// ─── Types ────────────────────────────────────────────────────────────────────

type ToolCall = { id: string; name: string; args: Record<string, unknown> };
type StepUpdate = {
  messages: Array<{ content: unknown; tool_calls?: ToolCall[]; tool_call_id?: string }>;
};

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
          "uri" in file ? file.uri : `data:${mimeType};base64,${"bytes" in file ? file.bytes : ""}`;
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

    if (step === "model_request" && lastMsg) {
      if (lastMsg.tool_calls?.length) {
        for (const tc of lastMsg.tool_calls) {
          const query =
            typeof tc.args?.query === "string" ? tc.args.query : JSON.stringify(tc.args);
          toolQueryMap.set(tc.id, { toolName: tc.name, query });
          console.log(`[Tool Call] ${tc.name} executing with args:`, query);
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
      
      // Attempt to capture and log model token usage from metadata payload
      if (lastMsg.usage_metadata) {
        usageMetadata = lastMsg.usage_metadata;
        console.log(`[Observatory - Token Usage]`, lastMsg.usage_metadata);
      }
    } else if (step === "tools") {
      for (const msg of messages) {
        if (!msg.tool_call_id) continue;
        const { toolName: resolvedToolName, query } = toolQueryMap.get(msg.tool_call_id) ?? {
          toolName: "unknown",
          query: "",
        };
        toolQueryMap.delete(msg.tool_call_id);

        const rawContent = typeof msg.content === "string" ? msg.content : "";
        console.log(
          `[Tool Result] ${resolvedToolName}:`,
          rawContent.substring(0, 200) + (rawContent.length > 200 ? "..." : "")
        );

        // Handle image generation tool result
        if (resolvedToolName === "generate_image") {
          try {
            const parsed = JSON.parse(rawContent) as {
              success: boolean;
              image_base64?: string;
              mimeType?: string;
              error?: string;
            };
            if (parsed.success && parsed.image_base64) {
              const mimeType = parsed.mimeType ?? "image/png";
              const ext = mimeType.split("/")[1] ?? "png";
              eventBus.publish({
                kind: "artifact-update",
                taskId,
                contextId,
                append: false,
                lastChunk: true,
                artifact: {
                  artifactId: msg.tool_call_id,
                  name: "generated-image",
                  description: `Generated image for: ${query}`,
                  parts: [
                    {
                      kind: "file",
                      file: {
                        name: `generated-image.${ext}`,
                        mimeType,
                        bytes: parsed.image_base64,
                      },
                    },
                  ],
                },
              });
            }
          } catch {
            // parse error — fall through to generic tool-call event
          }
          continue;
        }

        let resultCount = 0;
        try {
          const parsed = JSON.parse(rawContent) as Record<string, unknown>;
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
                data: { phase: "done", toolName: resolvedToolName, query, resultCount },
              },
            ],
          },
        });
      }
    }
  }

  return { responseText, usageMetadata };
}

// ─── Agent executor ───────────────────────────────────────────────────────────

const activeAbortControllers = new Map<string, AbortController>();

export const chatAgentExecutor: AgentExecutor = {
  async execute(requestContext: RequestContext, eventBus: ExecutionEventBus) {
    const { taskId, contextId, userMessage } = requestContext;

    console.log(`\n--- [Task Initiated] Context ID: ${contextId} | Task ID: ${taskId} ---`);
    console.log(`[Input]`, JSON.stringify(userMessage.parts, null, 2));

    // Build multimodal content from all message parts
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

    try {
      const { responseText, usageMetadata } = await streamAgentResponse(
        agent,
        content,
        contextId,
        taskId,
        eventBus,
        abortController.signal
      );
      
      console.log(`[Final Response]`, responseText);
      console.log(`--- [Task Complete] Context ID: ${contextId} | Task ID: ${taskId} ---\n`);

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
    } finally {
      activeAbortControllers.delete(taskId);
    }

    eventBus.finished();
  },

  async cancelTask(taskId: string, eventBus: ExecutionEventBus) {
    const controller = activeAbortControllers.get(taskId);
    if (controller) {
      controller.abort();
      activeAbortControllers.delete(taskId);
    }

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
