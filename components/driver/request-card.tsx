"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { acceptRide, rejectRide } from "@/lib/rides";
import { useToast } from "@/components/providers/toast-provider";
import { RideCard } from "@/components/ride/ride-card";
import { Button } from "@/components/ui/button";
import type { RideWithRelations } from "@/lib/types";

export function RequestCard({
  ride,
  driverId,
  onResolved,
}: {
  ride: RideWithRelations;
  driverId: string;
  onResolved: () => void;
}) {
  const { toast } = useToast();
  const [pending, setPending] = useState<"accept" | "reject" | null>(null);
  const busy = pending !== null;

  async function handleAccept() {
    if (busy) return;
    setPending("accept");
    try {
      const ok = await acceptRide(ride.id, driverId);
      if (!ok) {
        toast("This ride was just taken by another driver", "warning");
      } else {
        toast("Ride accepted", "success");
      }
    } catch (err) {
      console.error("[request] accept failed", err);
      toast("Could not accept the ride. Try again.", "error");
    } finally {
      setPending(null);
      onResolved();
    }
  }

  async function handleReject() {
    if (busy) return;
    setPending("reject");
    try {
      await rejectRide(ride.id, driverId);
      toast("Request passed on", "info");
    } catch (err) {
      console.error("[request] reject failed", err);
      toast("Could not pass on the ride. Try again.", "error");
    } finally {
      setPending(null);
      onResolved();
    }
  }

  return (
    <RideCard
      ride={ride}
      showStatus={false}
      person={{
        name: ride.client?.name ?? "Customer",
        subtitle: ride.client?.phone,
      }}
      footer={
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            onClick={handleReject}
            disabled={busy}
            loading={pending === "reject"}
            aria-label="Pass on this ride"
          >
            {pending !== "reject" && <X className="h-4 w-4" />}
            Pass
          </Button>
          <Button
            variant="primary"
            onClick={handleAccept}
            disabled={busy}
            loading={pending === "accept"}
            aria-label="Accept this ride"
          >
            {pending !== "accept" && <Check className="h-4 w-4" />}
            Accept
          </Button>
        </div>
      }
    />
  );
}
