"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarX, Search, Bell, Plane, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { createRide } from "@/lib/rides";
import { friendlyErrorMessage } from "@/lib/utils";
import { useSession } from "@/components/providers/session-provider";
import { useToast } from "@/components/providers/toast-provider";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { StaggerList } from "@/components/motion/motion";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { EventCard, type DriverPreview } from "@/components/events/event-card";
import {
  EventBookingPanel,
  type EventBookingSubmit,
} from "@/components/events/event-booking-panel";
import type { EventItem, RideType } from "@/lib/types";

export default function EventsPage() {
  const router = useRouter();
  const { client } = useSession();
  const { toast } = useToast();

  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [driverCount, setDriverCount] = useState(0);
  const [driverPreviews, setDriverPreviews] = useState<DriverPreview[]>([]);

  const [activeEvent, setActiveEvent] = useState<EventItem | null>(null);
  const [initialRideType, setInitialRideType] = useState<RideType>("private");

  useEffect(() => {
    let active = true;
    async function load() {
      const [eventsRes, driversRes] = await Promise.all([
        supabase.from("events").select("*").order("event_date", { ascending: true }),
        supabase
          .from("drivers")
          .select("id, name, vehicle_type", { count: "exact" })
          .eq("is_available", true),
      ]);
      if (!active) return;
      setEvents((eventsRes.data ?? []) as EventItem[]);
      setDriverCount(driversRes.count ?? driversRes.data?.length ?? 0);
      setDriverPreviews(
        ((driversRes.data ?? []) as DriverPreview[]).slice(0, 3)
      );
      setLoading(false);
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  function handleBook(event: EventItem, rideType: RideType) {
    if (!client) {
      toast("Sign up as a client to book", "info");
      router.push("/signup/client");
      return;
    }
    setInitialRideType(rideType);
    setActiveEvent(event);
  }

  const handleSubmit = useCallback(
    async (values: EventBookingSubmit): Promise<boolean> => {
      if (!activeEvent) return false;
      if (!client) {
        toast("Sign up as a client to book", "info");
        router.push("/signup/client");
        return false;
      }
      try {
        await createRide({
          client_id: client.id,
          event_id: activeEvent.id,
          pickup: values.pickup,
          destination: activeEvent.location,
          scheduled_at: values.scheduledAt,
          vehicle_category: values.vehicleCategory,
          ride_type: values.rideType,
          budget: values.budget,
        });
        toast(`Ride to ${activeEvent.name} requested!`, "success");
        return true;
      } catch (err) {
        toast(friendlyErrorMessage(err, "Could not request ride. Try again."), "error");
        return false;
      }
    },
    [activeEvent, client, router, toast]
  );

  return (
    <AppShell>
      {/* Top bar */}
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {client ? (
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-gradient text-xs font-bold text-white">
              {client.name.charAt(0)}
            </span>
          ) : (
            <span className="h-10 w-10 rounded-full bg-surface-2" />
          )}
          <span className="font-display text-base font-bold uppercase tracking-[0.12em]">
            TripNest
          </span>
        </div>
        <button className="grid h-10 w-10 place-items-center rounded-xl text-muted-foreground transition-colors hover:text-foreground">
          <Bell className="h-5 w-5" />
        </button>
      </div>

      {/* Heading */}
      <h1 className="mb-1 font-display text-2xl font-extrabold text-foreground">
        Upcoming Events
      </h1>
      <p className="mb-5 text-sm leading-relaxed text-muted-foreground">
        Arrive in style. Shared or solo, we&apos;ve got your ride covered.
      </p>

      {/* Search bar */}
      <div className="mb-4 flex items-center gap-3 rounded-2xl border border-border bg-surface-2/60 px-4 py-3">
        <Search className="h-5 w-5 text-muted-foreground" />
        <input
          placeholder="Search events or locations..."
          className="input-transparent w-full bg-transparent text-[15px] focus:outline-none"
        />
      </div>

      {/* Airport transfers entry point */}
      <button
        onClick={() => router.push("/airport")}
        className="card mb-6 flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-surface-2/40"
      >
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary-soft">
          <Plane className="h-6 w-6 text-accent" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm font-bold text-foreground">
            Airport Transfers
          </p>
          <p className="text-xs text-muted-foreground">
            Book a ride to JKIA · See upcoming flight departures
          </p>
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
      </button>

      {loading ? (
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card overflow-hidden p-0">
              <Skeleton className="h-36 w-full rounded-none" />
              <div className="space-y-3 p-5">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : events.length === 0 ? (
        <EmptyState
          icon={CalendarX}
          title="No events yet"
          description="There are no upcoming events right now. Check back soon for festivals, runs, and nights out."
        />
      ) : (
        <StaggerList className="space-y-4">
          {events.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              driverCount={driverCount}
              driverPreviews={driverPreviews}
              onBook={handleBook}
            />
          ))}
        </StaggerList>
      )}

      {activeEvent && (
        <EventBookingPanel
          open={!!activeEvent}
          event={activeEvent}
          initialRideType={initialRideType}
          onClose={() => setActiveEvent(null)}
          onSubmit={handleSubmit}
        />
      )}
    </AppShell>
  );
}
