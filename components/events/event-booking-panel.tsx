"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { MapPin, Calendar, Wallet, X, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import {
  VEHICLE_CATEGORIES,
  RIDE_TYPES,
  type EventItem,
  type VehicleCategory,
  type RideType,
} from "@/lib/types";
import { formatDate } from "@/lib/utils";

export interface EventBookingSubmit {
  pickup: string;
  scheduledAt: string | null;
  vehicleCategory: VehicleCategory;
  rideType: RideType;
  budget: number;
}

/** Builds a datetime-local string for the event date at 18:00 local time. */
function eventDefaultDateTime(eventDate: string): string {
  // eventDate is a date string (e.g. "2026-07-12"); pin to 18:00.
  const datePart = eventDate.slice(0, 10);
  return `${datePart}T18:00`;
}

export function EventBookingPanel({
  open,
  event,
  initialRideType,
  onClose,
  onSubmit,
}: {
  open: boolean;
  event: EventItem;
  initialRideType: RideType;
  onClose: () => void;
  /** Resolve true on success so the panel can close. */
  onSubmit: (values: EventBookingSubmit) => Promise<boolean>;
}) {
  const [pickup, setPickup] = useState("");
  const [scheduledAt, setScheduledAt] = useState(
    eventDefaultDateTime(event.event_date)
  );
  const [vehicleCategory, setVehicleCategory] =
    useState<VehicleCategory>("standard");
  const [rideType, setRideType] = useState<RideType>(initialRideType);
  const [budget, setBudget] = useState(String(event.estimated_budget ?? ""));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setMounted(true), []);

  // Reset fields each time the panel re-opens (or ride type changes).
  useEffect(() => {
    if (open) {
      setRideType(initialRideType);
      setScheduledAt(eventDefaultDateTime(event.event_date));
      setBudget(String(event.estimated_budget ?? ""));
      setError(null);
      // Move focus into the panel for accessibility.
      const t = setTimeout(() => closeRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open, initialRideType, event.event_date, event.estimated_budget]);

  // Escape to close + lock background scroll while open.
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

  const titleId = `book-${event.id}-title`;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[900] flex items-end justify-center sm:items-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-background/70 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden
          />

          {/* Sheet */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={{ opacity: 0, y: 40, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="card relative z-10 max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-b-none rounded-t-3xl p-5 sm:rounded-3xl"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2
                  id={titleId}
                  className="font-display text-lg font-bold text-foreground"
                >
                  Book ride to event
                </h2>
                <p className="mt-0.5 truncate text-sm text-muted-foreground">
                  {event.name} · {formatDate(event.event_date)}
                </p>
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={onClose}
                aria-label="Close booking panel"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-border bg-surface-2/60 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <Field
                label="Pickup location"
                htmlFor={`pickup-${event.id}`}
                required
                error={error && !pickup.trim() ? error : undefined}
              >
                <div className="relative">
                  <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-success" />
                  <Input
                    id={`pickup-${event.id}`}
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
                  <Navigation className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-accent" />
                  <Input
                    value={event.location}
                    readOnly
                    aria-readonly
                    className="pl-10 opacity-90"
                  />
                </div>
              </Field>

              <Field label="Date & time" htmlFor={`when-${event.id}`}>
                <div className="relative">
                  <Calendar className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id={`when-${event.id}`}
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </Field>

              <Field label="Vehicle type" required>
                <Segmented
                  name={`vehicle-${event.id}`}
                  options={VEHICLE_CATEGORIES}
                  value={vehicleCategory}
                  onChange={setVehicleCategory}
                  columns={3}
                />
              </Field>

              <Field label="Ride type" required>
                <Segmented
                  name={`ride-${event.id}`}
                  options={RIDE_TYPES}
                  value={rideType}
                  onChange={setRideType}
                  columns={2}
                />
              </Field>

              <Field
                label="Transport budget (KES)"
                htmlFor={`budget-${event.id}`}
                required
                error={error && pickup.trim() ? error : undefined}
                hint={
                  rideType === "cost_sharing"
                    ? "Cost sharing splits the fare — you'll usually pay less."
                    : undefined
                }
              >
                <div className="relative">
                  <Wallet className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-accent" />
                  <Input
                    id={`budget-${event.id}`}
                    type="number"
                    inputMode="decimal"
                    min={1}
                    max={1000000}
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    placeholder="e.g. 1500"
                    className="pl-10"
                    invalid={!!error && !!pickup.trim()}
                  />
                </div>
              </Field>

              <Button type="submit" size="lg" fullWidth loading={submitting}>
                {submitting ? "Requesting…" : `Request ride to ${event.name}`}
              </Button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
