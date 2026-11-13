import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Standalone on purpose: the app's vite.config.ts goes through
// @lovable.dev/vite-tanstack-config (TanStack Start, nitro, devtools), none
// of which pure-function unit tests need.
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
