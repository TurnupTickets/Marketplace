// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// GH Pages preview build: no server, so SPA mode + static asset base path.
// Two independent signals, deliberately not one: GH_PAGES_BUILD turns on
// SPA/prerender/no-nitro (served from a custom domain's root — no repo-name
// subpath since public/CNAME maps it); GH_PAGES_BASE is only for the older
// github.io/<repo>/ subpath layout, and is optional. Collapsing these into
// one flag (GH_PAGES_BASE's mere presence) previously meant dropping the
// subpath also silently dropped SPA mode itself, breaking the build
// ("cp: cannot stat 'dist/client/index.html'" — a normal SSR build doesn't
// produce that path at all).
const isGhPagesBuild = process.env["GH_PAGES_BUILD"] === "true";
const ghPagesBase = process.env["GH_PAGES_BASE"];

export default defineConfig({
  ...(ghPagesBase ? { vite: { base: `/${ghPagesBase}/` } } : {}),
  // GH Pages can't run the nitro/cloudflare SSR server — skip it for this build.
  ...(isGhPagesBuild ? { nitro: false } : {}),
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
    ...(isGhPagesBuild
      ? {
          spa: {
            enabled: true,
            prerender: { enabled: true, outputPath: "index.html" },
          },
        }
      : {}),
  },
});
