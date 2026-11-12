import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  redirect,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { languagesQuery, seoSettingsQuery } from "../lib/api/queries";
import { splitLocalePrefix } from "../lib/locale";
import { getRealUrl, setLanguagesCache } from "../lib/locale-runtime";
import { createIsomorphicFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { NOT_FOUND_MARKER_HEADER } from "../lib/not-found-marker";

/**
 * HTTP 404 for the SSR response; no-op in the browser. The router computes
 * the SSR status from its own matches (200 here, since the 404 page is
 * rendered by RootComponent, not a notFound match) and overrides
 * setResponseStatus — so mark the response and let src/server.ts set 404.
 */
const markNotFoundResponse = createIsomorphicFn()
  .server(() => {
    try {
      setResponseHeader(NOT_FOUND_MARKER_HEADER, "1");
    } catch {
      /* outside a request (prerender) — nothing to set */
    }
  })
  .client(() => {});

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          {/* Plain <a>, not a router Link: on an unknown-language 404
              (`/de_de/...`) the router would re-add that prefix to "/". */}
          <a
            href={import.meta.env.BASE_URL}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  // Validates the same-domain language prefix the router rewrite stripped
  // (see router.tsx). Also loads the language list first on every SSR
  // request / client boot, so every later API call (seo-settings below,
  // page loaders) already carries the right X-Localization.
  beforeLoad: async ({ context, location }) => {
    const languages = await context.queryClient.ensureQueryData(languagesQuery()).catch(() => null);
    // Languages unavailable: don't take the site down over the prefix.
    if (!languages) return { unknownLocale: false };

    const { code } = splitLocalePrefix(getRealUrl().pathname);
    if (!code) return { unknownLocale: false };
    const lang = languages.find((l) => l.code === code);
    // Only CMS language codes count as a prefix — anything else is a 404.
    // Not `throw notFound()`: thrown from the root route (beforeLoad or
    // loader) it escapes the document shell and renders as a 500. The flag
    // makes RootComponent render the 404 page inside the normal shell.
    if (!lang) return { unknownLocale: true };
    // The default language is never prefixed: `/pl_pl/x` → `/x`. With the
    // list loaded the router no longer re-adds this prefix, so the
    // internal href redirects to the unprefixed URL.
    if (lang.is_default) throw redirect({ href: location.href, replace: true });
    return { unknownLocale: false };
  },
  loader: async ({ context }) => {
    if (context.unknownLocale) markNotFoundResponse();
    // This loader runs for every route (root) — a hard failure here would
    // break the whole app's SSR on any seo-settings hiccup, not just the
    // homepage. Confirmed not hypothetical: a GH Pages prerender build hit
    // this for real (500 from one network path, 403 — likely a WAF/bot
    // rule — from GitHub Actions' runner IP on another). SEO meta/tracking
    // scripts are enhancement, not core functionality, so degrade to the
    // hardcoded fallbacks below rather than taking the page down.
    const seo = await context.queryClient.ensureQueryData(seoSettingsQuery()).catch(() => null);
    // Shipped to the client with the SSR payload: the browser's query cache
    // isn't dehydrated, so without this the client-side languages cache (and
    // with it X-Localization on domain-based languages) would stay empty
    // after hydration until something refetched the list.
    const languages = context.queryClient.getQueryData(languagesQuery().queryKey) ?? null;
    return { seo, unknownLocale: context.unknownLocale, languages };
  },
  head: ({ loaderData }) => ({
    // Every route sets its own title/description via its own head() — these
    // are root-level fallbacks, not overrides. TanStack Router's head
    // merging dedupes by tag key (title is singular; meta by name/property)
    // keeping the most specific (leaf) route's value, so a route that sets
    // its own title/description simply wins over these without any
    // conditional logic here.
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: loaderData?.seo?.meta_title || "Turnup — bilety na wydarzenia" },
      {
        name: "description",
        content:
          loaderData?.seo?.meta_description ||
          "Marketplace biletów na koncerty, festiwale i imprezy.",
      },
      { property: "og:title", content: "Turnup — bilety na wydarzenia" },
      {
        property: "og:description",
        content: "Marketplace biletów na koncerty, festiwale i imprezy.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      ...(loaderData?.seo?.meta_keywords
        ? [{ name: "keywords", content: loaderData.seo.meta_keywords }]
        : []),
    ],
    // Same-origin CMS admin content, not user input — safe to inject as raw
    // markup (plan's explicit contract for this field).
    scripts: loaderData?.seo?.tracking_head_script
      ? [{ children: loaderData.seo.tracking_head_script }]
      : [],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=DM+Sans:wght@400;500;700&display=swap",
      },
      { rel: "icon", href: `${import.meta.env.BASE_URL}fav/favicon.ico`, type: "image/x-icon" },
      {
        rel: "icon",
        href: `${import.meta.env.BASE_URL}fav/favicon-32x32.png`,
        type: "image/png",
        sizes: "32x32",
      },
      {
        rel: "icon",
        href: `${import.meta.env.BASE_URL}fav/favicon-16x16.png`,
        type: "image/png",
        sizes: "16x16",
      },
      {
        rel: "apple-touch-icon",
        href: `${import.meta.env.BASE_URL}fav/apple-touch-icon.png`,
        sizes: "180x180",
      },
      { rel: "manifest", href: `${import.meta.env.BASE_URL}fav/site.webmanifest` },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
        {/* EventImage starts transparent and fades in once hydrated JS sees
            the load — without JS that never happens, so show images as-is. */}
        <noscript>
          <style>{`.event-image-fade{opacity:1!important}.event-image-shimmer{display:none}`}</style>
        </noscript>
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const { seo, unknownLocale, languages } = Route.useLoaderData();
  // Synchronous on purpose (not an effect): it must be in place before any
  // child's first client-side API call. Idempotent module-level write.
  if (languages) setLanguagesCache(languages);

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      {unknownLocale ? <NotFoundComponent /> : <Outlet />}
      {seo?.tracking_body_script && (
        // Same-origin CMS admin content, not user input (plan's explicit
        // contract) — placed at the end of <body> per the field's name,
        // separately from tracking_head_script above.
        <script dangerouslySetInnerHTML={{ __html: seo.tracking_body_script }} />
      )}
    </QueryClientProvider>
  );
}
