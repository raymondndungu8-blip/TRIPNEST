"use client";

import { motion } from "framer-motion";
import { MapPin, Navigation, Clock, Wallet, CalendarHeart } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import {
  CategoryBadge,
  RideTypeBadge,
  StatusBadge,
} from "@/components/ui/badge";
import { fadeUp } from "@/components/motion/motion";
import { formatDateTime, formatKES } from "@/lib/utils";
import type { RideWithRelations } from "@/lib/types";

export function RideCard({
  ride,
  person,
  showStatus = true,
  footer,
}: {
  ride: RideWithRelations;
  /** Whose info to show in the header: the counterpart on this ride. */
  person?: { name: string; subtitle?: string } | null;
  showStatus?: boolean;
  footer?: React.ReactNode;
}) {
  return (
    <motion.article variants={fadeUp} className="card p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        {person ? (
          <div className="flex items-center gap-2.5">
            <Avatar name={person.name} size={38} />
            <div className="leading-tight">
              <p className="text-sm font-semibold text-foreground">
                {person.name}
              </p>
              {person.subtitle && (
                <p className="text-xs text-muted-foreground">{person.subtitle}</p>
              )}
            </div>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">
            {formatDateTime(ride.created_at)}
          </span>
        )}
        {showStatus && <StatusBadge status={ride.status} />}
      </div>

      {ride.event?.name && (
        <div className="mb-2 inline-flex items-center gap-1.5 rounded-lg bg-primary-soft px-2 py-1 text-xs font-medium text-accent">
          <CalendarHeart className="h-3.5 w-3.5" />
          {ride.event.name}
        </div>
      )}

      <div className="relative pl-5">
        <span className="absolute left-[5px] top-2 h-[calc(100%-16px)] w-px bg-border" />
        <div className="relative mb-2 flex items-start gap-2.5">
          <MapPin className="absolute -left-5 top-0.5 h-4 w-4 text-success" />
          <p className="text-sm text-foreground">{ride.pickup}</p>
        </div>
        <div className="relative flex items-start gap-2.5">
          <Navigation className="absolute -left-5 top-0.5 h-4 w-4 text-accent" />
          <p className="text-sm text-foreground">{ride.destination}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          {formatDateTime(ride.scheduled_at)}
        </span>
        <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
          <Wallet className="h-3.5 w-3.5 text-accent" />
          {formatKES(ride.budget)}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <CategoryBadge category={ride.vehicle_category} />
        <RideTypeBadge type={ride.ride_type} />
      </div>

      {footer && <div className="mt-4">{footer}</div>}
    </motion.article>
  );
}
