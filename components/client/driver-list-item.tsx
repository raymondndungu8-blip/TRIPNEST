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
      className="flex items-center gap-3 rounded-[1.35rem] border border-cyan-400/10 bg-[#10192b]/82 p-3.5 shadow-[0_14px_40px_rgba(0,0,0,0.28)] backdrop-blur"
    >
      <Avatar name={driver.name} size={52} className="shadow-[0_0_26px_rgba(0,212,255,0.35)]" />
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
          "grid h-12 w-12 shrink-0 place-items-center rounded-2xl border transition-colors disabled:opacity-50",
          isFavorite
            ? "border-destructive/30 bg-destructive/15 text-destructive"
            : "border-cyan-400/10 bg-[#0b1424]/70 text-muted-foreground hover:text-foreground"
        )}
      >
        <Heart className={cn("h-5 w-5", isFavorite && "fill-current")} />
      </button>
    </motion.div>
  );
}
