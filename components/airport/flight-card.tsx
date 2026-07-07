"use client";

import { motion } from "framer-motion";
import { PlaneTakeoff, Clock, MapPin } from "lucide-react";
import { fadeUp } from "@/components/motion/motion";
import { Button } from "@/components/ui/button";
import type { Flight } from "@/lib/flights";

function formatFlightTime(iso: string): { time: string; date: string } {
  const d = new Date(iso);
  return {
    time: d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    date: d.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" }),
  };
}

export function FlightCard({
  flight,
  onBook,
}: {
  flight: Flight;
  onBook: (flight: Flight) => void;
}) {
  const { time, date } = formatFlightTime(flight.departure);

  return (
    <motion.article variants={fadeUp} className="card p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-soft">
            <PlaneTakeoff className="h-5 w-5 text-accent" />
          </span>
          <div>
            <p className="font-display text-sm font-bold text-foreground">
              {flight.airline}
            </p>
            <p className="text-xs text-muted-foreground">{flight.flightNo}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-display text-lg font-bold text-foreground">{time}</p>
          <p className="text-[11px] text-muted-foreground">{date}</p>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 text-sm text-foreground">
        <MapPin className="h-4 w-4 shrink-0 text-accent" />
        <span>
          {flight.city}, <span className="text-muted-foreground">{flight.country}</span>
        </span>
      </div>

      <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
        <Clock className="h-3.5 w-3.5 shrink-0" />
        {flight.terminal}
      </div>

      <Button
        size="md"
        variant="outline"
        fullWidth
        className="mt-3.5"
        onClick={() => onBook(flight)}
      >
        Book ride for this flight
      </Button>
    </motion.article>
  );
}
