"use client";

import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { fadeUp } from "@/components/motion/motion";
import { motion } from "framer-motion";
import type { EventItem, RideType } from "@/lib/types";
import { formatDate, formatKES } from "@/lib/utils";

/** Local fallback banners for seeded events (matched by keyword in the name). */
const EVENT_IMAGE_MAP: Record<string, string> = {
  summertides: "/images/event-summertides.png",
  diani: "/images/event-diani-beach.png",
  "night run": "/images/event-nairobi-run.png",
  nairobi: "/images/event-nairobi-run.png",
};

function resolveEventImage(event: EventItem): string | null {
  if (event.image_url) return event.image_url;
  const lower = event.name.toLowerCase();
  for (const [key, src] of Object.entries(EVENT_IMAGE_MAP)) {
    if (lower.includes(key)) return src;
  }
  return null;
}

export interface DriverPreview {
  id: string;
  name: string;
}

export function EventCard({
  event,
  driverCount,
  driverPreviews,
  onBook,
}: {
  event: EventItem;
  driverCount: number;
  driverPreviews: DriverPreview[];
  onBook: (event: EventItem, rideType: RideType) => void;
}) {
  const bannerSrc = resolveEventImage(event);

  return (
    <motion.article variants={fadeUp} className="card overflow-hidden p-0">
      {/* Banner */}
      <div className="relative h-44 w-full overflow-hidden bg-brand-gradient">
        {bannerSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={bannerSrc}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div
            aria-hidden
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                "radial-gradient(420px 160px at 20% -20%, rgba(255,255,255,0.45), transparent 60%)",
            }}
          />
        )}
        {/* Trending badge */}
        <span className="absolute right-3 top-3 rounded-full bg-accent/90 px-3 py-1 text-[11px] font-semibold text-background">
          Trending
        </span>
      </div>

      <div className="p-5">
        {/* Event name */}
        <h3 className="font-display text-xl font-bold text-foreground">
          {event.name}
        </h3>

        {/* Location */}
        <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4 shrink-0 text-accent" aria-hidden />
          <span className="truncate text-foreground">{event.location}</span>
        </div>

        {/* Date + Drivers row */}
        <div className="mt-4 flex gap-6">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Date
            </p>
            <p className="mt-0.5 text-sm font-semibold text-foreground">
              {formatDate(event.event_date)}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Drivers
            </p>
            <p className="mt-0.5 text-sm font-semibold text-foreground">
              {driverCount > 0 ? `${driverCount} Available` : "TBD"}
            </p>
          </div>
        </div>

        {/* Budget + avatars row */}
        <div className="mt-4 flex items-end justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Est. Budget
            </p>
            <p className="mt-0.5 text-lg font-bold text-accent">
              {formatKES(event.estimated_budget)}
            </p>
          </div>
          {driverPreviews.length > 0 && (
            <div className="flex items-center">
              <div className="flex -space-x-2">
                {driverPreviews.slice(0, 3).map((d) => (
                  <Avatar
                    key={d.id}
                    name={d.name}
                    size={28}
                    className="ring-2 ring-surface"
                  />
                ))}
              </div>
              {driverCount > 3 && (
                <span className="ml-1 text-xs font-medium text-muted-foreground">
                  +{driverCount - 3}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Book button */}
        <div className="mt-5">
          <Button
            size="lg"
            fullWidth
            variant="outline"
            onClick={() => onBook(event, "private")}
            className="border-accent/40 text-accent hover:bg-accent/10"
          >
            Book Ride
          </Button>
        </div>
      </div>
    </motion.article>
  );
}
