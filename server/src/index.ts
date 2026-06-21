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

function buildCorsOrigin(allowedOrigins: string | undefined): cors.CorsOptions["origin"] {
  if (!allowedOrigins) {
    // Default: allow only localhost origins so the dev server works out of the box
    return [/^http:\/\/localhost(:\d+)?$/, /^http:\/\/127\.0\.0\.1(:\d+)?$/];
  }
  if (allowedOrigins === "*") return "*";
  return allowedOrigins.split(",").map((o) => o.trim()).filter(Boolean);
}

const agentCard = createAgentCard(BASE_URL);

const requestHandler = new DefaultRequestHandler(
  agentCard,
  new InMemoryTaskStore(),
  chatAgentExecutor,
);

const app = express();
app.use(cors({ origin: buildCorsOrigin(env.ALLOWED_ORIGINS) }));
app.use(express.json());

app.use(`/${AGENT_CARD_PATH}`, agentCardHandler({ agentCardProvider: requestHandler }));
app.get("/.well-known/agent.json", (_req, res) => {
  res.redirect(308, `/${AGENT_CARD_PATH}`);
});
app.use(
  "/a2a/jsonrpc",
  jsonRpcHandler({ requestHandler, userBuilder: UserBuilder.noAuthentication }),
);
app.use("/a2a/rest", restHandler({ requestHandler, userBuilder: UserBuilder.noAuthentication }));

app.listen(PORT, () => {
  console.log(`A2A server running at ${BASE_URL}`);
  console.log(`Agent card: ${BASE_URL}/${AGENT_CARD_PATH}`);
});
