"use client";

import { useMemo } from "react";
import { Route, CheckCheck, Ban } from "lucide-react";
import { useSession } from "@/components/providers/session-provider";
import { RequireRole } from "@/components/auth/require-role";
import { useDriverRides } from "@/hooks/use-rides";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionTitle } from "@/components/ui/section";
import { FadeIn, StaggerList } from "@/components/motion/motion";
import { TripCard } from "@/components/driver/trip-card";
import type { Driver } from "@/lib/types";

function DriverTrips({ driver }: { driver: Driver }) {
  const { rides, loading, refetch } = useDriverRides(driver.id);

  const active = useMemo(
    () =>
      rides.filter(
        (r) => r.status === "accepted" || r.status === "in_progress"
      ),
    [rides]
  );
  const completed = useMemo(
    () => rides.filter((r) => r.status === "completed"),
    [rides]
  );
  const cancelled = useMemo(
    () => rides.filter((r) => r.status === "cancelled" || r.status === "rejected"),
    [rides]
  );

  const hasAny = active.length + completed.length + cancelled.length > 0;

  return (
    <AppShell>
      <FadeIn>
        <PageHeader
          title="Your trips"
          subtitle="Rides you've accepted, completed, or cancelled."
        />
      </FadeIn>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-44 w-full" />
          <Skeleton className="h-44 w-full" />
        </div>
      ) : !hasAny ? (
        <EmptyState
          icon={Route}
          title="No trips yet"
          description="Accept a ride request from your dashboard and it will show up here."
        />
      ) : (
        <>
          {active.length > 0 && (
            <>
              <SectionTitle>Active</SectionTitle>
              <StaggerList className="space-y-3">
                {active.map((ride) => (
                  <TripCard key={ride.id} ride={ride} onResolved={refetch} />
                ))}
              </StaggerList>
            </>
          )}

          {completed.length > 0 && (
            <>
              <SectionTitle>
                <span className="inline-flex items-center gap-1.5">
                  <CheckCheck className="h-3.5 w-3.5 text-success" />
                  Completed
                </span>
              </SectionTitle>
              <StaggerList className="space-y-3">
                {completed.map((ride) => (
                  <TripCard key={ride.id} ride={ride} onResolved={refetch} />
                ))}
              </StaggerList>
            </>
          )}

          {cancelled.length > 0 && (
            <>
              <SectionTitle>
                <span className="inline-flex items-center gap-1.5">
                  <Ban className="h-3.5 w-3.5 text-destructive" />
                  Cancelled
                </span>
              </SectionTitle>
              <StaggerList className="space-y-3">
                {cancelled.map((ride) => (
                  <TripCard key={ride.id} ride={ride} onResolved={refetch} />
                ))}
              </StaggerList>
            </>
          )}
        </>
      )}
    </AppShell>
  );
}

export default function DriverTripsPage() {
  const { driver } = useSession();
  return (
    <RequireRole role="driver">
      {driver && <DriverTrips driver={driver} />}
    </RequireRole>
  );
}
