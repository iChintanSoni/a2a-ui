import express from "express";
import cors from "cors";
import { DefaultRequestHandler, InMemoryTaskStore } from "@a2a-js/sdk/server";
import {
  jsonRpcHandler,
  agentCardHandler,
  restHandler,
  UserBuilder,
} from "@a2a-js/sdk/server/express";
import type { AgentCard } from "@a2a-js/sdk";
import { AGENT_CARD_PATH } from "@a2a-js/sdk";
import { chatAgentExecutor } from "#src/agent.ts";
import { env } from "#src/env.ts";

const PORT = env.PORT;
const BASE_URL = env.BASE_URL || `http://localhost:${PORT}`;

const agentCard: AgentCard = {
  name: "Chat Agent",
  description: "A conversational agent powered by Google Gemini with Tavily search.",
  url: `${BASE_URL}/a2a/jsonrpc`,
  version: "1.0.0",
  protocolVersion: "0.3.0",
  defaultInputModes: ["text", "image/*"],
  defaultOutputModes: ["text", "image/*"],
  capabilities: {
    streaming: true,
  },
  additionalInterfaces: [
    { url: `${BASE_URL}/a2a/jsonrpc`, transport: "JSONRPC" },
    { url: `${BASE_URL}/a2a/rest`, transport: "HTTP+JSON" },
  ],
  skills: [
    {
      id: "chat",
      name: "Chat",
      description: "Conversational responses with optional web search.",
      tags: ["chat", "search"],
      examples: ["What is the capital of France?", "Search for the latest news on AI"],
    },
    {
      id: "image-generation",
      name: "Image Generation",
      description: "Generate images from text prompts using Google Gemini.",
      tags: ["image", "generation", "creative"],
      examples: ["Generate an image of a sunset over mountains", "Draw a futuristic city at night"],
    },
  ],
};

const requestHandler = new DefaultRequestHandler(
  agentCard,
  new InMemoryTaskStore(),
  chatAgentExecutor,
);

const app = express();
app.use(cors());
app.use(express.json());

app.use(`/${AGENT_CARD_PATH}`, agentCardHandler({ agentCardProvider: requestHandler }));
app.use(
  "/a2a/jsonrpc",
  jsonRpcHandler({ requestHandler, userBuilder: UserBuilder.noAuthentication }),
);
app.use("/a2a/rest", restHandler({ requestHandler, userBuilder: UserBuilder.noAuthentication }));

app.listen(PORT, () => {
  console.log(`A2A server running at ${BASE_URL}`);
  console.log(`Agent card: ${BASE_URL}/.well-known/agent.json`);
});
