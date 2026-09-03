import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: "happy-dom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    // The bin/*.mjs entrypoints start with a shebang, which Vite's SSR
    // transform cannot parse. Let Node load them natively instead.
    server: { deps: { external: [/[\\/]bin[\\/].*\.mjs$/] } },
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    coverage: {
      provider: "v8",
      include: ["lib/**", "hooks/**", "app/actions/**"],
      exclude: ["lib/store.ts", "lib/hooks.ts"],
    },
  },
});
