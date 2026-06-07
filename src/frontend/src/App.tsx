import { Layout } from "@/components/Layout";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { Suspense, lazy } from "react";

const GamesPage = lazy(() => import("@/pages/GamesPage"));
const InvestigationPage = lazy(() => import("@/pages/InvestigationPage"));
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));
const HistoryPageLazy = lazy(() => import("@/pages/HistoryPage"));

const rootRoute = createRootRoute({
  component: () => (
    <Layout>
      <Suspense
        fallback={
          <div className="p-8 space-y-4 max-w-screen-2xl mx-auto">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        }
      >
        <Outlet />
      </Suspense>
    </Layout>
  ),
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: GamesPage,
});

const gameRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/game/$gameId",
  validateSearch: (search: Record<string, unknown>) => ({
    gameDate: (search.gameDate as string) ?? "",
  }),
  component: InvestigationPage,
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
  component: SettingsPage,
});

const historyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/history",
  component: HistoryPageLazy,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  gameRoute,
  settingsRoute,
  historyRoute,
]);

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  return <RouterProvider router={router} />;
}
