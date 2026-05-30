// Production host server.
//
// Serves the static Vite build (`dist/`) as a single-page app and mounts the
// same-origin `/api/proxy` endpoint. Launched by the npx CLI (`bin/a2a-ui.mjs`)
// and by `npm start`. Honours PORT / HOSTNAME env vars (set by the CLI).

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { handleProxyRequest } from "./proxy.mjs";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const distDir = join(rootDir, "dist");

if (!existsSync(join(distDir, "index.html"))) {
  console.error("Missing production build. Run `npm run build` first.");
  process.exit(1);
}

// serveStatic resolves paths relative to the current working directory.
process.chdir(rootDir);

const app = new Hono();

app.all("/api/proxy", (c) => handleProxyRequest(c.req.raw));
app.use("/*", serveStatic({ root: "./dist" }));
// SPA fallback: any unmatched route returns index.html for client routing.
app.get("*", serveStatic({ path: "./dist/index.html" }));

const port = Number(process.env.PORT ?? "3000");
const hostname = process.env.HOSTNAME || undefined;

serve({ fetch: app.fetch, port, hostname }, (info) => {
  const host = !hostname || hostname === "0.0.0.0" || hostname === "::" ? "localhost" : hostname;
  console.log(`A2A UI running at http://${host}:${info.port}`);
});
