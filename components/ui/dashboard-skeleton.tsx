import { Skeleton } from "@/components/ui/skeleton";
import { AppShell } from "@/components/layout/app-shell";

/**
 * Dashboard skeleton shown while the session/profile resolves on launch. Gives
 * customers a sense of structure ("your dashboard is loading") instead of a
 * bare spinner, so the app feels fast and intentional.
 */
export function DashboardSkeleton() {
  return (
    <AppShell>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-6 w-44" />
          <Skeleton className="h-3.5 w-28" />
        </div>
        <Skeleton className="h-10 w-10 rounded-full" />
      </div>

      {/* Stat cards */}
      <div className="mt-6 grid grid-cols-3 gap-2">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>

      {/* Section title + list of ride cards */}
      <div className="mt-6 space-y-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    </AppShell>
  );
}