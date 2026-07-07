"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { MapPin, Calendar, Wallet, X, Plane } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import {
  VEHICLE_CATEGORIES,
  RIDE_TYPES,
  type VehicleCategory,
  type RideType,
} from "@/lib/types";
import type { Flight } from "@/lib/flights";

export interface AirportBookingSubmit {
  pickup: string;
  scheduledAt: string | null;
  vehicleCategory: VehicleCategory;
  rideType: RideType;
  budget: number;
}

const JKIA = "JKIA Terminal 1, Nairobi";

/** Default pickup time — 3 hours before departure, for international flights. */
function defaultPickupTime(departureIso?: string): string {
  const base = departureIso ? new Date(departureIso) : new Date();
  base.setHours(base.getHours() - 3);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${base.getFullYear()}-${pad(base.getMonth() + 1)}-${pad(base.getDate())}T${pad(base.getHours())}:${pad(base.getMinutes())}`;
}

export function AirportBookingPanel({
  open,
  flight,
  onClose,
  onSubmit,
}: {
  open: boolean;
  flight: Flight | null;
  onClose: () => void;
  onSubmit: (values: AirportBookingSubmit) => Promise<boolean>;
}) {
  const [pickup, setPickup] = useState("");
  const [scheduledAt, setScheduledAt] = useState(defaultPickupTime(flight?.departure));
  const [vehicleCategory, setVehicleCategory] = useState<VehicleCategory>("standard");
  const [rideType, setRideType] = useState<RideType>("private");
  const [budget, setBudget] = useState("2500");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (open) {
      setScheduledAt(defaultPickupTime(flight?.departure));
      setError(null);
      const t = setTimeout(() => closeRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open, flight]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pickup.trim() || pickup.trim().length > 200) {
      setError("Enter a pickup location (max 200 characters)");
      return;
    }
    const budgetNum = Number(budget);
    if (!budget.trim() || Number.isNaN(budgetNum) || budgetNum <= 0 || budgetNum > 1_000_000) {
      setError("Enter a valid transport budget (1 – 1,000,000)");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const ok = await onSubmit({
        pickup: pickup.trim(),
        scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
        vehicleCategory,
        rideType,
        budget: budgetNum,
      });
      if (ok) {
        setPickup("");
        onClose();
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[900] flex items-end justify-center sm:items-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-background/70 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, y: 40, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="card relative z-10 max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-b-none rounded-t-3xl p-5 sm:rounded-3xl"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="font-display text-lg font-bold text-foreground">
                  Book airport ride
                </h2>
                <p className="mt-0.5 truncate text-sm text-muted-foreground">
                  {flight
                    ? `${flight.airline} ${flight.flightNo} · ${flight.city}, ${flight.country}`
                    : "Drop-off at JKIA"}
                </p>
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={onClose}
                aria-label="Close booking panel"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-border bg-surface-2/60 text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <Field
                label="Pickup location"
                htmlFor="airport-pickup"
                required
                error={error && !pickup.trim() ? error : undefined}
              >
                <div className="relative">
                  <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-success" />
                  <Input
                    id="airport-pickup"
                    value={pickup}
                    onChange={(e) => setPickup(e.target.value)}
                    placeholder="e.g. Westlands, Nairobi"
                    maxLength={200}
                    className="pl-10"
                    invalid={!!error && !pickup.trim()}
                    autoComplete="off"
                  />
                </div>
              </Field>

              <Field label="Destination">
                <div className="relative">
                  <Plane className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-accent" />
                  <Input value={JKIA} readOnly aria-readonly className="pl-10 opacity-90" />
                </div>
              </Field>

              <Field
                label="Pickup time"
                htmlFor="airport-when"
                hint={flight ? "Defaulted to 3 hours before departure" : undefined}
              >
                <div className="relative">
                  <Calendar className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="airport-when"
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </Field>

              <Field label="Vehicle type" required>
                <Segmented
                  name="airport-vehicle"
                  options={VEHICLE_CATEGORIES}
                  value={vehicleCategory}
                  onChange={setVehicleCategory}
                  columns={3}
                />
              </Field>

              <Field label="Ride type" required>
                <Segmented
                  name="airport-ride-type"
                  options={RIDE_TYPES}
                  value={rideType}
                  onChange={setRideType}
                  columns={2}
                />
              </Field>

              <Field
                label="Transport budget (KES)"
                htmlFor="airport-budget"
                required
                error={error && pickup.trim() ? error : undefined}
              >
                <div className="relative">
                  <Wallet className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-accent" />
                  <Input
                    id="airport-budget"
                    type="number"
                    inputMode="decimal"
                    min={1}
                    max={1000000}
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    placeholder="e.g. 2500"
                    className="pl-10"
                    invalid={!!error && !!pickup.trim()}
                  />
                </div>
              </Field>

              <Button type="submit" size="lg" fullWidth loading={submitting}>
                {submitting ? "Requesting…" : "Request airport ride"}
              </Button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
