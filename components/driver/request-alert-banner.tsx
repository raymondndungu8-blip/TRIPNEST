"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Check, MapPin, Navigation, X } from "lucide-react";
import { acceptRide } from "@/lib/rides";
import { notifyUser } from "@/lib/notify";
import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { formatKES } from "@/lib/utils";
import type { RideWithRelations } from "@/lib/types";

/**
 * Full-screen overlay that flashes the moment a new ride request lands, so the
 * driver can accept without scrolling the feed. Auto-dismisses via the parent.
 */
export function RequestAlertBanner({
  ride,
  driverId,
  onAccepted,
  onDismiss,
}: {
  ride: RideWithRelations;
  driverId: string;
  onAccepted: () => void;
  onDismiss: () => void;
}) {
  const { toast } = useToast();
  const [accepting, setAccepting] = useState(false);

  async function handleAccept() {
    if (accepting) return;
    setAccepting(true);
    try {
      const ok = await acceptRide(ride.id, driverId);
      if (!ok) {
        toast("This ride was just taken by another driver", "warning");
      } else {
        toast("Ride accepted", "success");
        if (ride.client?.id) {
          notifyUser({
            targetUserId: ride.client.id,
            title: "Ride accepted 🚗",
            body: `Your driver is on the way to ${ride.pickup}.`,
            url: "/client",
          }).catch(() => {});
        }
      }
      onAccepted();
    } catch (err) {
      console.error("[alert] accept failed", err);
      toast("Could not accept the ride. Try again.", "error");
      onDismiss();
    } finally {
      setAccepting(false);
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -16 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        className="pointer-events-none fixed inset-0 z-50 flex items-start justify-center px-4 pt-6"
        role="alertdialog"
        aria-label="New ride request"
      >
        <div className="pointer-events-auto w-full max-w-md overflow-hidden rounded-3xl border border-accent/30 bg-surface shadow-glow">
          {/* Header */}
          <div className="flex items-center gap-2.5 bg-accent/10 px-4 py-3">
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="absolute inline-flex h-2.5 w-2.5 animate-ping rounded-full bg-accent opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent" />
            </span>
            <p className="text-sm font-bold text-accent">New ride request</p>
            <button
              type="button"
              onClick={onDismiss}
              aria-label="Dismiss"
              className="ml-auto grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Route */}
          <div className="px-4 py-3.5">
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center gap-1 pt-1">
                <span className="h-2.5 w-2.5 rounded-full border-2 border-success" />
                <span className="h-10 w-px bg-border" />
                <span className="h-2.5 w-2.5 rounded-full bg-accent" />
              </div>
              <div className="min-w-0 flex-1 space-y-3">
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  <p className="truncate text-sm font-medium text-foreground">
                    {ride.pickup}
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <Navigation className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                  <p className="truncate text-sm font-medium text-foreground">
                    {ride.destination}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {ride.pickup_lat && ride.pickup_lng && ride.driver_distance_km != null ? (
                  <span className="font-semibold text-accent">
                    {ride.driver_distance_km.toFixed(1)} km away
                  </span>
                ) : (
                  "Nearby request"
                )}
              </span>
              <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
                <Bell className="h-4 w-4 text-accent" />
                {formatKES(ride.budget)}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-2 border-t border-border px-4 py-3.5">
            <Button variant="outline" onClick={onDismiss} disabled={accepting}>
              <X className="h-4 w-4" />
              Later
            </Button>
            <Button variant="primary" onClick={handleAccept} loading={accepting}>
              {!accepting && <Check className="h-4 w-4" />}
              Accept
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}