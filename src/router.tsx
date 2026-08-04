import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

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
  });

  return router;
};
