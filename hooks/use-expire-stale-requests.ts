"use client";

import { useEffect, useRef } from "react";
import { expireRideRequest, REQUEST_TTL_SECONDS, rideDueAt } from "@/lib/rides";
import type { RideWithRelations } from "@/lib/types";

/**
 * Background sweeper that auto-expires open requests older than
 * `REQUEST_TTL_SECONDS`. Runs every few seconds while the driver is online and
 * only touches rides that are still `requested` with no driver (the Firestore
 * transaction in `expireRideRequest` makes the check atomic), so an accepted
 * ride is never cancelled.
 */
export function useExpireStaleRequests(
  requests: RideWithRelations[],
  enabled: boolean
) {
  const expiredRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!enabled) return;

    const tick = () => {
      const now = Date.now();
      const stale = requests.filter((r) => {
        if (expiredRef.current.has(r.id)) return false;
        // Scheduled rides only start counting down once their time arrives.
        return now - rideDueAt(r) > REQUEST_TTL_SECONDS * 1000;
      });

      stale.forEach((ride) => {
        // Mark locally first so a request isn't re-fought every tick.
        expiredRef.current.add(ride.id);
        expireRideRequest(ride.id)
          .then((done) => {
            if (!done) {
              // Already accepted/taken by someone else — safe to unmark.
              expiredRef.current.delete(ride.id);
            }
          })
          .catch(() => expiredRef.current.delete(ride.id));
      });
    };

    const interval = setInterval(tick, 3000);
    return () => clearInterval(interval);
  }, [requests, enabled]);
}
