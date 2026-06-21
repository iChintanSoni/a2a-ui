import { createAgent } from "langchain";
import { MemorySaver } from "@langchain/langgraph";
import { TavilySearch } from "@langchain/tavily";
import { DynamicStructuredTool, type StructuredToolInterface } from "@langchain/core/tools";
import { z } from "zod";
import { ChatOllama } from "@langchain/ollama";
import { env } from "#src/env.ts";

const model = new ChatOllama({
  model: env.OLLAMA_LLM_MODEL,
  baseUrl: env.OLLAMA_HOST,
  temperature: 0.7,
});

const checkpointer = new MemorySaver();

const generateImageTool = new DynamicStructuredTool({
  name: "generate_image",
  description:
    "Generate an image from a text prompt using AI. Use this when the user asks to create, draw, render, or generate an image.",
  schema: z.object({
    prompt: z.string().describe("The text description of the image to generate"),
  }),
  func: async ({ prompt }) => {
    try {
      const ollamaHost = env.OLLAMA_HOST;
      const ollamaImageModelName = env.OLLAMA_IMAGE_MODEL;

      const response = await fetch(`${ollamaHost}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: ollamaImageModelName, prompt, stream: false }),
      });

      if (!response.ok) {
        const body = await response.text();
        console.error(`[generate_image] Ollama error (${response.status}): ${body}`);
        return JSON.stringify({ success: false, error: "Image generation failed. Check server logs." });
      }

      const data = (await response.json()) as { images?: string[]; response?: string };
      let base64Image = data.images?.[0];
      if (!base64Image && typeof data.response === "string") {
        // Some Ollama image models return base64 in response instead of images.
        base64Image = data.response;
      }

      if (base64Image) {
        if (base64Image.startsWith("data:")) base64Image = base64Image.split(",")[1];
        return JSON.stringify({ success: true, image_base64: base64Image, mimeType: "image/png" });
      }

      return JSON.stringify({ success: false, error: "No image found in Ollama response." });
    } catch (error) {
      console.error("[generate_image] Unexpected error:", error);
      return JSON.stringify({ success: false, error: "Image generation failed. Check server logs." });
    }
  },
});

export const tools: StructuredToolInterface[] = [generateImageTool];
if (env.TAVILY_API_KEY) {
  tools.unshift(new TavilySearch({ maxResults: 3, tavilyApiKey: env.TAVILY_API_KEY }));
} else {
  console.warn("TAVILY_API_KEY is not set. The demo server will run without web search.");
}

const SEARCH_PROMPT = env.TAVILY_API_KEY
  ? "Use the search tool when you need up-to-date information. " +
    "At the end of every response that references any sources, facts, or search results, " +
    "include a '**References**' section with a numbered markdown list of links in the format: " +
    "1. [Title](URL). Only include this section when you have actual URLs to cite. "
  : "If the user asks for up-to-date information, say that web search is not configured. ";

const SYSTEM_PROMPT =
  "You are a helpful assistant. " +
  SEARCH_PROMPT +
  "When the user asks to generate or create an image, use the generate_image tool.";

export const agent = createAgent({
  model,
  systemPrompt: SYSTEM_PROMPT + " When the user provides an image, describe and analyse it as part of your response.",
  checkpointer,
  tools,
});
