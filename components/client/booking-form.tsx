"use client";

import { useState } from "react";
import { MapPin, Navigation, Calendar, Wallet, Sparkles, ArrowRight } from "lucide-react";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import {
  VEHICLE_CATEGORIES,
  RIDE_TYPES,
  type VehicleCategory,
  type RideType,
} from "@/lib/types";

export interface BookingValues {
  pickup: string;
  destination: string;
  scheduledAt: string;
  vehicleCategory: VehicleCategory;
  rideType: RideType;
  budget: string;
}

type Errors = Partial<Record<keyof BookingValues, string>>;

export function BookingForm({
  vehicleCategory,
  onVehicleCategoryChange,
  onSubmit,
}: {
  vehicleCategory: VehicleCategory;
  onVehicleCategoryChange: (c: VehicleCategory) => void;
  /** Resolve to true on success so the form can reset. */
  onSubmit: (values: {
    pickup: string;
    destination: string;
    scheduledAt: string | null;
    vehicleCategory: VehicleCategory;
    rideType: RideType;
    budget: number;
  }) => Promise<boolean>;
}) {
  const [pickup, setPickup] = useState("");
  const [destination, setDestination] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [rideType, setRideType] = useState<RideType>("private");
  const [budget, setBudget] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);

  function validate(): Errors {
    const next: Errors = {};
    if (!pickup.trim()) next.pickup = "Enter a pickup location";
    if (!destination.trim()) next.destination = "Enter a destination";
    const budgetNum = Number(budget);
    if (!budget.trim()) next.budget = "Enter your budget";
    else if (Number.isNaN(budgetNum) || budgetNum <= 0)
      next.budget = "Enter a valid amount";
    return next;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    try {
      const ok = await onSubmit({
        pickup: pickup.trim(),
        destination: destination.trim(),
        scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
        vehicleCategory,
        rideType,
        budget: Number(budget),
      });
      if (ok) {
        setPickup("");
        setDestination("");
        setScheduledAt("");
        setRideType("private");
        setBudget("");
        setErrors({});
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary-soft">
          <Sparkles className="h-4 w-4 text-accent" />
        </span>
        <div>
          <CardTitle>Book Scheduled Ride</CardTitle>
          <CardDescription>Personalized travel from your trusted network.</CardDescription>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <Field label="Pickup location" htmlFor="pickup" required error={errors.pickup}>
          <div className="relative">
            <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-success" />
            <Input
              id="pickup"
              value={pickup}
              onChange={(e) => setPickup(e.target.value)}
              placeholder="e.g. Westlands, Nairobi"
              className="pl-10"
              invalid={!!errors.pickup}
              autoComplete="off"
            />
          </div>
        </Field>

        <Field
          label="Destination"
          htmlFor="destination"
          required
          error={errors.destination}
        >
          <div className="relative">
            <Navigation className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-accent" />
            <Input
              id="destination"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="e.g. JKIA Terminal 1A"
              className="pl-10"
              invalid={!!errors.destination}
              autoComplete="off"
            />
          </div>
        </Field>

        <Field
          label="Date & time"
          htmlFor="scheduledAt"
          hint="Leave empty to ride now."
        >
          <div className="relative">
            <Calendar className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="scheduledAt"
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="pl-10"
            />
          </div>
        </Field>

        <Field label="Vehicle type" required>
          <Segmented
            name="vehicle"
            options={VEHICLE_CATEGORIES}
            value={vehicleCategory}
            onChange={onVehicleCategoryChange}
            columns={3}
          />
        </Field>

        <Field label="Ride type" required>
          <Segmented
            name="rideType"
            options={RIDE_TYPES}
            value={rideType}
            onChange={setRideType}
            columns={2}
          />
        </Field>

        <Field
          label="Transport budget (KES)"
          htmlFor="budget"
          required
          error={errors.budget}
        >
          <div className="relative">
            <Wallet className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-accent" />
            <Input
              id="budget"
              type="number"
              inputMode="decimal"
              min={0}
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="e.g. 1500"
              className="pl-10"
              invalid={!!errors.budget}
            />
          </div>
        </Field>

        <Button type="submit" size="lg" fullWidth loading={submitting}>
          {submitting ? "Requesting…" : (
            <>
              Confirm Schedule
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </form>
    </Card>
  );
}
