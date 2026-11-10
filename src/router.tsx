import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { splitLocalePrefix, withLocalePrefix } from "./lib/locale";
import { getActivePathPrefix } from "./lib/locale-runtime";

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
    rewrite: {
      input: ({ url }) => {
        const { code, rest } = splitLocalePrefix(url.pathname);
        if (code) url.pathname = rest;
        return url;
      },
      output: ({ url }) => {
        const prefix = getActivePathPrefix();
        if (prefix && !splitLocalePrefix(url.pathname).code) {
          url.pathname = withLocalePrefix(url.pathname, prefix);
        }
        return url;
      },
    },
  });

  return router;
};
