import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import {
  internalizeEventsPath,
  localizeEventsPath,
  splitLocalePrefix,
  withLocalePrefix,
} from "./lib/locale";
import { getActiveEventsSegment, getActivePathPrefix } from "./lib/locale-runtime";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    // GH Pages serves this app from /<repo>/ instead of /; base is baked in at build
    // time via BASE_URL (set from GH_PAGES_BASE) so the app works both there and at "/".
    basepath: import.meta.env.BASE_URL,
    // Same-domain languages live under `/<code>/...` (e.g. `/en_en/wydarzenia`).
    // Route files stay prefix-free: `input` strips the segment before
    // matching, `output` re-adds the visitor's current prefix to every
    // href/navigation, so links keep the language. The root route validates
    // the code (default → redirect, unknown → 404). Composes after basepath.
    // The events section's first segment is per-language too
    // (`events_path_segment`): route files keep `/wydarzenia`, `input` maps
    // the public segment onto it and `output` maps it back. The internal
    // `/wydarzenia` stays accepted on input, so the router canonicalizes it
    // to the localized URL.
    rewrite: {
      input: ({ url }) => {
        const { code, rest } = splitLocalePrefix(url.pathname);
        url.pathname = internalizeEventsPath(code ? rest : url.pathname, getActiveEventsSegment());
        return url;
      },
      output: ({ url }) => {
        const { code, rest } = splitLocalePrefix(url.pathname);
        const localized = localizeEventsPath(code ? rest : url.pathname, getActiveEventsSegment());
        const prefix = code ?? getActivePathPrefix();
        url.pathname = withLocalePrefix(localized, prefix);
        return url;
      },
    },
  });

  return router;
};
