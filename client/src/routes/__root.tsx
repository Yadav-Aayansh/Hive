import type { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import {
  HeadContent,
  Outlet,
  createRootRouteWithContext,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { RouteErrorPage, RouteNotFoundPage } from "@/components/route-error";
import { RouteProgress } from "@/components/route-progress";
import { Toaster } from "@/components/ui/toast";

export interface RouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({ meta: [{ title: "Hive" }] }),
  component: RootLayout,
  errorComponent: RouteErrorPage,
  notFoundComponent: RouteNotFoundPage,
});

function RootLayout() {
  return (
    <>
      <HeadContent />
      <RouteProgress />
      <Outlet />
      <Toaster />
      {import.meta.env.DEV ? (
        <>
          <TanStackRouterDevtools />
          <ReactQueryDevtools initialIsOpen={false} />
        </>
      ) : null}
    </>
  );
}

