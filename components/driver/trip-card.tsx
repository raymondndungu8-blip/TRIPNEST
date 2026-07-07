"use client";

import { useState } from "react";
import { CheckCheck, KeyRound, X, Smartphone, MapPin } from "lucide-react";
import { startRideWithCode } from "@/lib/rides";
import { payWithMpesa } from "@/lib/mpesa";
import { useToast } from "@/components/providers/toast-provider";
import { RideCard } from "@/components/ride/ride-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { formatKES } from "@/lib/utils";
import type { RideWithRelations } from "@/lib/types";

export function TripCard({
  ride,
  onResolved,
}: {
  ride: RideWithRelations;
  onResolved: () => void;
}) {
  const { toast } = useToast();
  const [entering, setEntering] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  // Driver enters the client's code at pickup → ride starts.
  async function handleStart() {
    if (busy) return;
    if (code.trim().length < 4) {
      toast("Enter the 4-digit code from the client", "warning");
      return;
    }
    setBusy(true);
    try {
      const ok = await startRideWithCode(ride.id, code);
      if (ok) {
        toast("Code verified — trip started", "success");
        setEntering(false);
        setCode("");
        onResolved();
      } else {
        toast("Incorrect code — ask the client to read it again", "error");
      }
    } catch (err) {
      console.error("[trip] start failed", err);
      toast("Could not start the trip. Try again.", "error");
    } finally {
      setBusy(false);
    }
  }

  // At the destination, driver confirms arrival → STK push to the client.
  async function handleConfirmArrival() {
    if (busy) return;
    const phone = ride.client?.phone;
    if (!phone) {
      toast("Missing client phone for payment", "error");
      return;
    }
    setBusy(true);
    try {
      const res = await payWithMpesa({ ride_id: ride.id });
      if (res.ok) {
        toast("Payment request sent — client is entering their M-Pesa PIN", "success");
      } else {
        toast(res.error || "Could not request payment", "error");
      }
      onResolved();
    } catch {
      toast("Could not request payment. Try again.", "error");
    } finally {
      setBusy(false);
    }
  }

  let footer: React.ReactNode = null;

  if (ride.status === "accepted") {
    footer = entering ? (
      <div className="space-y-2.5">
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <KeyRound className="h-3.5 w-3.5 text-accent" />
          Ask the client for their 4-digit code to start the trip
        </p>
        <div className="flex items-center gap-2">
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
            inputMode="numeric"
            maxLength={4}
            autoFocus
            placeholder="••••"
            aria-label="Ride start code"
            className="text-center text-lg font-semibold tracking-[0.4em] tabular-nums"
          />
          <Button onClick={handleStart} loading={busy} className="shrink-0">
            {!busy && <CheckCheck className="h-4 w-4" />}
            Start
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Cancel"
            onClick={() => {
              setEntering(false);
              setCode("");
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    ) : (
      <Button variant="primary" fullWidth onClick={() => setEntering(true)}>
        <KeyRound className="h-4 w-4" />
        Start ride with code
      </Button>
    );
  } else if (ride.status === "in_progress") {
    if (ride.payment_status === "pending") {
      footer = (
        <div className="flex items-center gap-2 rounded-xl border border-warning/25 bg-warning/10 px-3.5 py-2.5 text-sm text-warning">
          <Spinner className="h-4 w-4 text-warning" />
          Waiting for the client to pay {formatKES(ride.budget)} on M-Pesa…
        </div>
      );
    } else {
      footer = (
        <div className="space-y-1.5">
          {ride.payment_status === "failed" && (
            <p className="text-xs text-destructive">
              Payment didn&apos;t go through — request it again.
            </p>
          )}
          <Button
            variant="secondary"
            fullWidth
            loading={busy}
            onClick={handleConfirmArrival}
            className="border-transparent bg-emerald-600 text-white hover:bg-emerald-500"
          >
            {!busy && <MapPin className="h-4 w-4" />}
            Confirm arrival & request {formatKES(ride.budget)}
          </Button>
        </div>
      );
    }
  } else if (ride.status === "completed") {
    footer = (
      <div className="flex items-center gap-2 rounded-xl border border-success/25 bg-success/10 px-3.5 py-2.5 text-sm text-success">
        <Smartphone className="h-4 w-4" />
        Paid · {formatKES(ride.budget)}
        {ride.mpesa_receipt ? ` · ${ride.mpesa_receipt}` : ""}
      </div>
    );
  }

  return (
    <RideCard
      ride={ride}
      showStatus
      person={{
        name: ride.client?.name ?? "Customer",
        subtitle: ride.client?.phone,
      }}
      footer={footer}
    />
  );
}
