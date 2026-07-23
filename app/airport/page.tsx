"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Bell, Plane, PlaneTakeoff } from "lucide-react";
import { useSession } from "@/components/providers/session-provider";
import { useToast } from "@/components/providers/toast-provider";
import { createRide } from "@/lib/rides";
import { FLIGHTS, type Flight } from "@/lib/flights";
import { friendlyErrorMessage } from "@/lib/utils";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { StaggerList } from "@/components/motion/motion";
import { FlightCard } from "@/components/airport/flight-card";
import {
  AirportBookingPanel,
  type AirportBookingSubmit,
} from "@/components/airport/airport-booking-panel";

export default function AirportPage() {
  const router = useRouter();
  const { client } = useSession();
  const { toast } = useToast();

  const [activeFlight, setActiveFlight] = useState<Flight | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  function handleBookGeneral() {
    if (!client) {
      toast("Sign up as a client to book", "info");
      router.push("/signup/client");
      return;
    }
    setActiveFlight(null);
    setPanelOpen(true);
  }

  function handleBookFlight(flight: Flight) {
    if (!client) {
      toast("Sign up as a client to book", "info");
      router.push("/signup/client");
      return;
    }
    setActiveFlight(flight);
    setPanelOpen(true);
  }

  const handleSubmit = useCallback(
    async (values: AirportBookingSubmit): Promise<boolean> => {
      if (!client) return false;
      try {
        await createRide({
          clientId: client.id,
          pickup: values.pickup,
          destination: "JKIA Terminal 1, Nairobi",
          scheduledAt: values.scheduledAt,
          vehicleCategory: values.vehicleCategory,
          rideType: values.rideType,
          budget: values.budget,
          eventId: null,
        });
        toast("Airport ride requested!", "success");
        return true;
      } catch (err) {
        toast(friendlyErrorMessage(err, "Could not request ride. Try again."), "error");
        return false;
      }
    },
    [client, toast]
  );

  return (
    <AppShell>
      {/* Top bar */}
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.back()}
            className="grid h-10 w-10 place-items-center rounded-xl text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="font-display text-base font-bold uppercase tracking-[0.12em]">
            Airport
          </span>
        </div>
        <button className="grid h-10 w-10 place-items-center rounded-xl text-muted-foreground transition-colors hover:text-foreground">
          <Bell className="h-5 w-5" />
        </button>
      </div>

      {/* Heading */}
      <h1 className="mb-1 font-display text-2xl font-extrabold text-foreground">
        Airport Transfers
      </h1>
      <p className="mb-5 text-sm leading-relaxed text-muted-foreground">
        Land or depart in style — book a ride to or from JKIA, timed to your flight.
      </p>

      {/* General booking CTA */}
      <div className="card mb-6 flex items-center gap-4 p-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary-soft">
          <Plane className="h-6 w-6 text-accent" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm font-bold text-foreground">
            Book a ride to the airport
          </p>
          <p className="text-xs text-muted-foreground">
            No flight listed below? Book a drop-off anytime.
          </p>
        </div>
        <Button size="sm" onClick={handleBookGeneral}>
          Book
        </Button>
      </div>

      {/* Upcoming flights */}
      <div className="mb-3 flex items-center gap-2">
        <PlaneTakeoff className="h-4 w-4 text-accent" />
        <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-foreground">
          Upcoming Departures
        </h2>
      </div>

      <StaggerList className="space-y-3">
        {FLIGHTS.map((flight) => (
          <FlightCard key={flight.id} flight={flight} onBook={handleBookFlight} />
        ))}
      </StaggerList>

      <AirportBookingPanel
        open={panelOpen}
        flight={activeFlight}
        onClose={() => setPanelOpen(false)}
        onSubmit={handleSubmit}
      />
    </AppShell>
  );
}
