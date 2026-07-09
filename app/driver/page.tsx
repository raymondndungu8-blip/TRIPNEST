"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeftRight,
  CalendarCheck,
  Inbox,
  Moon,
  Route,
  Wallet,
} from "lucide-react";
import { useSession } from "@/components/providers/session-provider";
import { RequireRole } from "@/components/auth/require-role";
import { useDriverRides, useOpenRequests } from "@/hooks/use-rides";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionTitle } from "@/components/ui/section";
import { FadeIn, StaggerList } from "@/components/motion/motion";
import { formatKES } from "@/lib/utils";
import type { Driver } from "@/lib/types";
import { AvailabilityCard } from "@/components/driver/availability-card";
import { RequestCard } from "@/components/driver/request-card";
import { TripCard } from "@/components/driver/trip-card";
import { StatCard } from "@/components/driver/stat-card";
import { BecomeRiderModal } from "@/components/driver/become-rider-modal";

function isToday(value: string | null): boolean {
  if (!value) return false;
  const d = new Date(value);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function DriverDashboard({ driver }: { driver: Driver }) {
  const router = useRouter();
  const { client, setRolePreference } = useSession();
  const [showBecomeRider, setShowBecomeRider] = useState(false);
  const {
    rides: requests,
    loading: requestsLoading,
    refetch: refetchRequests,
  } = useOpenRequests(driver.id, driver.is_available);

  const { rides: myTrips, refetch: refetchTrips } = useDriverRides(driver.id);

  const upcoming = useMemo(
    () =>
      myTrips.filter(
        (r) => r.status === "accepted" || r.status === "in_progress"
      ),
    [myTrips]
  );
  const history = useMemo(
    () => myTrips.filter((r) => r.status === "completed"),
    [myTrips]
  );

  const todaysAccepted = useMemo(
    () =>
      myTrips.filter(
        (r) =>
          (r.status === "accepted" || r.status === "completed") &&
          isToday(r.created_at)
      ).length,
    [myTrips]
  );
  const totalEarned = useMemo(
    () =>
      history.reduce((sum, r) => sum + (r.budget ?? 0), 0),
    [history]
  );

  // The trips list updates live; both sections share one refetch trigger.
  function refetchAll() {
    refetchRequests();
    refetchTrips();
  }

  function handleRiderCta() {
    if (client) {
      setRolePreference("client");
      router.push("/client");
    } else {
      setShowBecomeRider(true);
    }
  }

  return (
    <AppShell>
      <FadeIn>
        <PageHeader
          title={`Welcome back, ${driver.name.split(" ")[0]}`}
          subtitle="Your performance index is up this week."
          action={
            <button
              type="button"
              onClick={handleRiderCta}
              aria-label={client ? "Switch to rider mode" : "Become a rider"}
              className="mt-0.5 flex shrink-0 items-center gap-1.5 rounded-xl border border-border bg-surface-2/60 px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeftRight className="h-4 w-4" />
              {client ? "Rider mode" : "Become a rider"}
            </button>
          }
        />
      </FadeIn>

      {/* Incoming requests (Active Alerts) */}
      <SectionTitle>Incoming requests</SectionTitle>
      {!driver.is_available ? (
        <EmptyState
          icon={Moon}
          title="You're offline"
          description="Toggle availability on to start receiving ride requests."
        />
      ) : requestsLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-44 w-full" />
          <Skeleton className="h-44 w-full" />
        </div>
      ) : requests.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No requests right now"
          description="New ride requests will appear here the moment they come in."
        />
      ) : (
        <StaggerList className="space-y-3">
          {requests.map((ride) => (
            <RequestCard
              key={ride.id}
              ride={ride}
              driverId={driver.id}
              onResolved={refetchAll}
            />
          ))}
        </StaggerList>
      )}

      {/* Availability */}
      <div className="mt-5">
        <AvailabilityCard driver={driver} />
      </div>

      {/* Stats */}
      <StaggerList className="mb-1 grid grid-cols-3 gap-2">
        <StatCard
          icon={Wallet}
          label="TODAY'S REVENUE"
          value={formatKES(totalEarned)}
        />
        <StatCard
          icon={CalendarCheck}
          label="TOTAL RIDES"
          value={String(todaysAccepted)}
        />
        <StatCard
          icon={Route}
          label="Completed"
          value={String(history.length)}
        />
      </StaggerList>

      {/* Upcoming trips */}
      <SectionTitle>Your trips</SectionTitle>
      {upcoming.length === 0 ? (
        <EmptyState
          icon={Route}
          title="No upcoming trips"
          description="Accepted rides will show up here for you to manage."
        />
      ) : (
        <StaggerList className="space-y-3">
          {upcoming.map((ride) => (
            <TripCard key={ride.id} ride={ride} onResolved={refetchAll} />
          ))}
        </StaggerList>
      )}

      {/* History */}
      {history.length > 0 && (
        <>
          <SectionTitle>History</SectionTitle>
          <StaggerList className="space-y-3">
            {history.map((ride) => (
              <TripCard key={ride.id} ride={ride} onResolved={refetchAll} />
            ))}
          </StaggerList>
        </>
      )}

      {showBecomeRider && (
        <BecomeRiderModal
          driver={driver}
          onClose={() => setShowBecomeRider(false)}
        />
      )}
    </AppShell>
  );
}

export default function DriverPage() {
  const { driver } = useSession();
  return (
    <RequireRole role="driver">
      {driver && <DriverDashboard driver={driver} />}
    </RequireRole>
  );
}
