import { fileURLToPath, URL } from "node:url";
import { defineConfig, type PluginOption } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { proxyNodeMiddleware } from "./host/proxy.mjs";

// Mounts the same-origin /api/proxy handler in the dev and preview servers so
// the browser can reach cross-origin A2A agents (mirrors the production host).
function a2aProxyPlugin(): PluginOption {
  return {
    name: "a2a-proxy",
    configureServer(server) {
      server.middlewares.use("/api/proxy", proxyNodeMiddleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use("/api/proxy", proxyNodeMiddleware);
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), a2aProxyPlugin()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 3000,
  },
});
