import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig, loadEnv, type PluginOption, type UserConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";

// Static SPA build (Cloudflare Workers Static Assets): no server, so SPA mode
// + prerendered shell, nitro off. Two independent signals, deliberately not
// one: GH_PAGES_BUILD turns on SPA/prerender/no-nitro; GH_PAGES_BASE is only
// for a /<subpath>/ layout, and is optional. Collapsing these into one flag
// (GH_PAGES_BASE's mere presence) previously meant dropping the subpath also
// silently dropped SPA mode itself, breaking the build. The GH_PAGES_ name is
// historical — the Workers Builds build commands set it.
const isStaticBuild = process.env["GH_PAGES_BUILD"] === "true";
const ghPagesBase = process.env["GH_PAGES_BASE"];

export default defineConfig(({ command, mode }) => {
  const isDevBuild = command === "build" && mode === "development";

  // Inline VITE_* (from .env files and process.env) as static defines, so
  // bracket access like import.meta.env["VITE_API_URL"] is replaced too.
  const envDefine = Object.fromEntries(
    Object.entries(loadEnv(mode, process.cwd(), "VITE_")).map(([key, value]) => [
      `import.meta.env.${key}`,
      JSON.stringify(value),
    ]),
  );

  const plugins: PluginOption[] = [
    tailwindcss(),
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tanstackStart({
      importProtection: {
        behavior: "error",
        client: { files: ["**/server/**"], specifiers: ["server-only"] },
      },
      // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
      // nitro/vite builds from this
      server: { entry: "server" },
      ...(isStaticBuild
        ? {
            spa: {
              enabled: true,
              // Prerendering "/" fetches it from the real backend at BUILD
              // time (root route's loader calls GET /seo-settings, Phase 10)
              // — spa mode renders that shell regardless of this nested
              // `enabled` flag, so it can't be used to skip the backend
              // dependency. The actual fix is the root loader tolerating a
              // failed seo-settings fetch (see __root.tsx) instead of this.
              prerender: { enabled: true, outputPath: "index.html" },
            },
          }
        : {}),
    }),
    // SSR server build (Cloudflare module Worker); skipped for the static build.
    ...(command === "build" && !isStaticBuild
      ? [nitro({ defaultPreset: "cloudflare-module" })]
      : []),
    viteReact(),
  ];

  const config: UserConfig = {
    define: envDefine,
    css: { transformer: "lightningcss" },
    resolve: {
      alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
      dedupe: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@tanstack/react-query",
        "@tanstack/query-core",
      ],
    },
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "react-dom/client",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
      ],
      ignoreOutdatedRequests: true,
    },
    server: { host: "::", port: 8080 },
    plugins,
  };
  if (ghPagesBase) config.base = `/${ghPagesBase}/`;
  if (isDevBuild) {
    // `vite build --mode development` (npm run build:dev): unminified-ish
    // debugging build with React dev warnings and readable function names.
    config.environments = {
      client: { define: { "process.env.NODE_ENV": JSON.stringify("development") } },
    };
    // Vite 8's ESBuildOptions type dropped keepNames; kept as-is to match the
    // previous (@lovable.dev/vite-tanstack-config) build:dev output.
    config.esbuild = { keepNames: true } as NonNullable<UserConfig["esbuild"]>;
  }
  return config;
});
