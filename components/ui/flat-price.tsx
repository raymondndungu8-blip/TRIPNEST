"use client";

import { BadgeCheck, Users } from "lucide-react";
import type { RideType, VehicleCategory } from "@/lib/types";
import { flatRate, formatKes } from "@/lib/pricing";

/**
 * Upfront flat-rate price for a ride, derived from the selected vehicle tier
 * and ride type. Private = solo flat rate; cost sharing = lower split price.
 */
export function FlatPrice({
  category,
  rideType,
}: {
  category: VehicleCategory;
  rideType: RideType;
}) {
  const cost = flatRate(category, rideType);
  const shared = rideType === "cost_sharing";

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-accent/25 bg-primary-soft px-4 py-3">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {shared ? "Cost sharing · flat rate" : "Private ride · flat rate"}
        </p>
        <p className="text-2xl font-bold tabular-nums tracking-tight text-accent">
          {formatKes(cost)}
        </p>
      </div>
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        {shared ? (
          <>
            <Users className="h-4 w-4 text-accent" aria-hidden />
            split per rider
          </>
        ) : (
          <>
            <BadgeCheck className="h-4 w-4 text-accent" aria-hidden />
            no meter · fixed price
          </>
        )}
      </span>
    </div>
  );
}
