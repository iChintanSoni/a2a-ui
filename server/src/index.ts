import express from "express";
import cors from "cors";
import { DefaultRequestHandler, InMemoryTaskStore } from "@a2a-js/sdk/server";
import {
  jsonRpcHandler,
  agentCardHandler,
  restHandler,
  UserBuilder,
} from "@a2a-js/sdk/server/express";
import { AGENT_CARD_PATH } from "@a2a-js/sdk";
import { chatAgentExecutor } from "#src/agent.ts";
import { createAgentCard } from "#src/card.ts";
import { env } from "#src/env.ts";

const PORT = env.PORT;
const BASE_URL = env.BASE_URL || `http://localhost:${PORT}`;

const agentCard = createAgentCard(BASE_URL);

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
