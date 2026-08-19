import { useRouterState } from "@tanstack/react-router";
import { PageShell } from "@/components/dashboard-kit";
import { Skeleton } from "@/components/ui/skeleton";

export function RouteProgress() {
  const pending = useRouterState({
    select: (state) => state.status === "pending",
  });

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-100 h-0.5"
    >
      <div
        className={
          pending
            ? "h-full w-full origin-left animate-[hive-progress_1.4s_ease-out_forwards] bg-primary"
            : "h-full w-full scale-x-0 bg-primary opacity-0 transition-opacity duration-300"
        }
      />
    </div>
  );
}

export function RoutePending() {
  return (
    <PageShell>
      <Skeleton className="h-9 w-48" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-56 w-full rounded-2xl" />
        ))}
      </div>
    </PageShell>
  );
}
