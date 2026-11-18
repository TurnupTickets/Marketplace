/**
 * Cloudflare Worker for the static SPA deploy (wrangler.jsonc).
 *
 * Static assets are served by Workers Static Assets before this script runs;
 * only `run_worker_first` paths reach it. Today that's /sitemap.xml, which the
 * SSR entry (src/server.ts) proxies from the backend — the SPA build has no
 * server, so this re-adds that one route.
 */

interface Env {
  API_ORIGIN: string;
  ASSETS: { fetch: (request: Request) => Promise<Response> };
}

async function proxySitemap(apiOrigin: string): Promise<Response> {
  try {
    const upstream = await fetch(`${apiOrigin}/api/marketplace/v1/sitemap.xml`);
    if (!upstream.ok || !upstream.body) {
      return new Response("Sitemap unavailable", { status: upstream.status || 502 });
    }
    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        "content-type": "application/xml; charset=utf-8",
        "cache-control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("sitemap proxy failed", error);
    return new Response("Sitemap unavailable", { status: 502 });
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const isRead = request.method === "GET" || request.method === "HEAD";
    if (isRead && url.pathname === "/sitemap.xml" && env.API_ORIGIN) {
      return proxySitemap(env.API_ORIGIN);
    }
    return env.ASSETS.fetch(request);
  },
};
