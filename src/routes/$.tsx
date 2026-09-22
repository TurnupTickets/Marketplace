import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { redirectLookupQuery } from "@/lib/api/queries";

/**
 * Splat/catch-all route — TanStack Router's `notFoundComponent` on the root
 * route renders synchronously (no loader of its own to await), so it can't
 * run the async "is there a redirect on file for this path?" check the plan
 * calls for. This route matches everything no other route does, runs that
 * check in its loader, and either redirects (a stale slug after an Event/
 * Tag/ContentPage rename) or falls through to `notFound()` — which bubbles
 * up to the same root `NotFoundComponent` as before, unchanged.
 */
export const Route = createFileRoute("/$")({
  loader: async ({ context, location }) => {
    const result = await context.queryClient.ensureQueryData(
      redirectLookupQuery(location.pathname),
    );
    if (result) throw redirect({ href: result.redirect, statusCode: 301 });
    throw notFound();
  },
});
