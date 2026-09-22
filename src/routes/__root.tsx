import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { seoSettingsQuery } from "../lib/api/queries";

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
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
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
  loader: async ({ context }) => {
    const seo = await context.queryClient.ensureQueryData(seoSettingsQuery());
    return { seo };
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
      { title: loaderData?.seo.meta_title || "Turnup — bilety na wydarzenia" },
      {
        name: "description",
        content:
          loaderData?.seo.meta_description ||
          "Marketplace biletów na koncerty, festiwale i imprezy.",
      },
      { property: "og:title", content: "Turnup — bilety na wydarzenia" },
      {
        property: "og:description",
        content: "Marketplace biletów na koncerty, festiwale i imprezy.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      ...(loaderData?.seo.meta_keywords
        ? [{ name: "keywords", content: loaderData.seo.meta_keywords }]
        : []),
    ],
    // Same-origin CMS admin content, not user input — safe to inject as raw
    // markup (plan's explicit contract for this field).
    scripts: loaderData?.seo.tracking_head_script
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
  const { seo } = Route.useLoaderData();

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
      {seo.tracking_body_script && (
        // Same-origin CMS admin content, not user input (plan's explicit
        // contract) — placed at the end of <body> per the field's name,
        // separately from tracking_head_script above.
        <script dangerouslySetInnerHTML={{ __html: seo.tracking_body_script }} />
      )}
    </QueryClientProvider>
  );
}
