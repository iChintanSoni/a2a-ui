import express from "express";
import {
  DefaultRequestHandler,
  InMemoryTaskStore,
} from "@a2a-js/sdk/server";
import {
  jsonRpcHandler,
  agentCardHandler,
  restHandler,
  UserBuilder,
} from "@a2a-js/sdk/server/express";
import type { AgentCard } from "@a2a-js/sdk";
import { AGENT_CARD_PATH } from "@a2a-js/sdk";
import { echoAgentExecutor } from "./agent.js";

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

const agentCard: AgentCard = {
  name: "Echo Agent",
  description: "A simple agent that echoes back user messages.",
  url: `${BASE_URL}/a2a/jsonrpc`,
  version: "1.0.0",
  protocolVersion: "0.3.0",
  defaultInputModes: ["text"],
  defaultOutputModes: ["text"],
  capabilities: {
    streaming: true,
  },
  additionalInterfaces: [
    { url: `${BASE_URL}/a2a/jsonrpc`, transport: "JSONRPC" },
    { url: `${BASE_URL}/a2a/rest`, transport: "HTTP+JSON" },
  ],
  skills: [
    {
      id: "echo",
      name: "Echo",
      description: "Echoes back the user message.",
      tags: ["echo", "demo"],
      examples: ["Hello!", "Say something"],
    },
  ],
};

const requestHandler = new DefaultRequestHandler(
  agentCard,
  new InMemoryTaskStore(),
  echoAgentExecutor
);

const app = express();
app.use(express.json());

app.use(`/${AGENT_CARD_PATH}`, agentCardHandler({ agentCardProvider: requestHandler }));
app.use("/a2a/jsonrpc", jsonRpcHandler({ requestHandler, userBuilder: UserBuilder.noAuthentication }));
app.use("/a2a/rest", restHandler({ requestHandler, userBuilder: UserBuilder.noAuthentication }));

app.listen(PORT, () => {
  console.log(`A2A server running at ${BASE_URL}`);
  console.log(`Agent card: ${BASE_URL}/.well-known/agent.json`);
});
