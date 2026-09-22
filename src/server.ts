import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

// Bare backend origin (see src/lib/api/client.ts's doc comment) — duplicated
// rather than imported since client.ts pulls in SSR-request-context helpers
// (createIsomorphicFn/@tanstack/react-start/server) this module has no use
// for and shouldn't need to load this early in the request pipeline.
const API_ORIGIN = import.meta.env["VITE_API_URL"] ?? "";

/**
 * Thin server-side proxy for /sitemap.xml (plan Phase 10.3).
 *
 * The plan called for a TanStack Start file-route (`sitemap[.]xml.ts`
 * exporting an API-route handler), but this installed version
 * (@tanstack/react-start 1.168.x) has no `createAPIFileRoute`/
 * `createServerFileRoute` export and no file-route convention for one
 * (verified: not in this package's export map, not in
 * @tanstack/router-generator's route-file detection) — the plan's own
 * caveat to "verify against the current file-route API before naming"
 * caught a real gap. This top-level fetch wrapper already intercepts every
 * request before the SPA router, so it's the adaptation: handle the one
 * XML route here instead of forcing a file-route API that doesn't exist in
 * this version.
 */
async function proxySitemap(request: Request): Promise<Response | null> {
  const url = new URL(request.url);
  if (request.method !== "GET" || url.pathname !== "/sitemap.xml") return null;
  if (!API_ORIGIN) return null; // mock mode (VITE_API_URL unset): no backend to proxy

  try {
    const upstream = await fetch(`${API_ORIGIN}/api/marketplace/v1/sitemap.xml`);
    if (!upstream.ok || !upstream.body) {
      return new Response("Sitemap unavailable", { status: upstream.status || 502 });
    }
    return new Response(upstream.body, {
      status: upstream.status,
      headers: { "content-type": "application/xml; charset=utf-8" },
    });
  } catch (error) {
    console.error("sitemap proxy failed", error);
    return new Response("Sitemap unavailable", { status: 502 });
  }
}

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const sitemap = await proxySitemap(request);
      if (sitemap) return sitemap;

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
