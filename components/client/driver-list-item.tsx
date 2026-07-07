"use client";

import { motion } from "framer-motion";
import { Heart, MapPin } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { CategoryBadge } from "@/components/ui/badge";
import { fadeUp } from "@/components/motion/motion";
import { cn } from "@/lib/utils";
import type { Driver } from "@/lib/types";

export function DriverListItem({
  driver,
  isFavorite,
  busy,
  onToggleFavorite,
}: {
  driver: Driver;
  isFavorite: boolean;
  busy?: boolean;
  onToggleFavorite: () => void;
}) {
  const location = driver.current_location || driver.frequent_location;

  return (
    <motion.div
      variants={fadeUp}
      className="card flex items-center gap-3 p-3.5"
    >
      <Avatar name={driver.name} size={44} />
      <div className="min-w-0 flex-1 leading-tight">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold text-foreground">
            {driver.name}
          </p>
          <CategoryBadge category={driver.vehicle_category} />
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {driver.vehicle_type} · {driver.plate_number}
        </p>
        {location && (
          <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 text-success" />
            <span className="truncate">{location}</span>
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={onToggleFavorite}
        disabled={busy}
        aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
        aria-pressed={isFavorite}
        className={cn(
          "grid h-11 w-11 shrink-0 place-items-center rounded-xl border transition-colors disabled:opacity-50",
          isFavorite
            ? "border-destructive/30 bg-destructive/10 text-destructive"
            : "border-border bg-surface-2/60 text-muted-foreground hover:text-foreground"
        )}
      >
        <Heart className={cn("h-5 w-5", isFavorite && "fill-current")} />
      </button>
    </motion.div>
  );
}
