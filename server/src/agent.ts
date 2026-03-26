import { type AgentExecutor, type ExecutionEventBus, RequestContext } from "@a2a-js/sdk/server";
import { createAgent } from "langchain";
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

const agent = createAgent({
  model,
  systemPrompt:
    "You are a helpful assistant. Use the search tool when you need up-to-date information. " +
    "At the end of every response that references any sources, facts, or search results, " +
    "include a '**References**' section with a numbered markdown list of links in the format: " +
    "1. [Title](URL). Only include this section when you have actual URLs to cite.",
  checkpointer,
  tools: [tavilySearch],
});

type ToolCall = { id: string; name: string; args: Record<string, unknown> };
type StepUpdate = { messages: Array<{ content: unknown; tool_calls?: ToolCall[]; tool_call_id?: string }> };

export const chatAgentExecutor: AgentExecutor = {
  async execute(requestContext: RequestContext, eventBus: ExecutionEventBus) {
    const { taskId, contextId, userMessage } = requestContext;

    const userText =
      userMessage.parts
        .filter(p => p.kind === "text")
        .map(p => (p as { kind: "text"; text: string }).text)
        .join(" ") || "(empty message)";

    eventBus.publish({
      kind: "status-update",
      taskId,
      contextId,
      final: false,
      status: { state: "working", timestamp: new Date().toISOString() },
    });

    try {
      const stream = await agent.stream(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { messages: [{ role: "human", content: userText }] } as any,
        { configurable: { thread_id: contextId }, streamMode: "updates" },
      );

      // Maps tool_call_id → query so the "done" event can echo back the query
      const toolQueryMap = new Map<string, string>();
      let responseText = "";

      for await (const chunk of stream) {
        const [step, update] = (Object.entries(chunk)[0] as unknown) as [string, StepUpdate];
        const messages = update.messages ?? [];
        const lastMsg = messages[messages.length - 1];

        if (step === "model_request" && lastMsg) {
          if (lastMsg.tool_calls?.length) {
            // LLM decided to call tools — emit a "running" artifact per call
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
            // Final LLM response
            responseText = lastMsg.content;
          }
        } else if (step === "tools") {
          // Tool results — emit a "done" artifact per result
          for (const msg of messages) {
            if (!msg.tool_call_id) continue;
            const query = toolQueryMap.get(msg.tool_call_id) ?? "";
            toolQueryMap.delete(msg.tool_call_id);
            let resultCount = 0;
            try {
              const parsed = JSON.parse(typeof msg.content === "string" ? msg.content : "") as Record<string, unknown>;
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
                parts: [{ kind: "data", data: { phase: "done", toolName: "tavily_search", query, resultCount } }],
              },
            });
          }
        }
      }

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
            parts: [{ kind: "text", text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
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
