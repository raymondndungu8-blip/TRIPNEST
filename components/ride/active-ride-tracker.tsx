"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Phone,
  MessageCircle,
  Share2,
  XCircle,
  ShieldCheck,
  Clock,
  Car,
  Route,
} from "lucide-react";
import { motion } from "framer-motion";
import { RideMap } from "@/components/ride/ride-map-dynamic";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatKES } from "@/lib/utils";
import type { RideWithRelations } from "@/lib/types";

const STATUS_LABEL: Record<string, string> = {
  requested: "SEARCHING FOR DRIVER",
  accepted: "DRIVER ON THE WAY",
  in_progress: "TRIP IN PROGRESS",
};

const STATUS_DESC: Record<string, (ride: RideWithRelations) => string> = {
  requested: (r) => `Finding a driver to ${r.destination}`,
  accepted: (r) => `Driver heading to ${r.pickup}`,
  in_progress: (r) => `En route to ${r.destination}`,
};

const MOCK_DRIVER: {
  name: string;
  vehicle_type: string;
  plate_number: string;
  phone: string;
  rating: number;
  rides: number;
} = {
  name: "Marcus Vance",
  vehicle_type: "Black Tesla Model 3",
  plate_number: "KDG 420B",
  phone: "+254712345678",
  rating: 4.9,
  rides: 2490,
};


export function ActiveRideTracker({
  ride,
  onCancel,
  cancelLoading,
}: {
  ride: RideWithRelations;
  onCancel: () => void;
  cancelLoading: boolean;
}) {
  const [showSOS, setShowSOS] = useState(false);

  const canCancel = ride.status === "requested" || ride.status === "accepted";
  const realDriver = ride.driver;
  const driver = realDriver ?? MOCK_DRIVER;
  const showDriver = ride.status === "accepted" || ride.status === "in_progress";

  const etaMin =
    ride.status === "requested"
      ? null
      : ride.status === "accepted"
        ? 8
        : 12;
  const distKm =
    ride.status === "requested"
      ? null
      : ride.status === "accepted"
        ? 3.2
        : 5.7;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="card overflow-hidden p-0"
    >
      {/* Top bar: ETA + Emergency */}
      <div className="flex items-center justify-between px-4 pt-4">
        {etaMin ? (
          <div className="rounded-xl bg-surface-2 px-4 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              ETA
            </p>
            <p className="font-display text-2xl font-bold text-foreground">
              {etaMin} <span className="text-base font-semibold text-muted-foreground">mins</span>
            </p>
          </div>
        ) : (
          <div className="rounded-xl bg-surface-2 px-4 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Status
            </p>
            <p className="text-base font-bold text-accent">Searching...</p>
          </div>
        )}
        <button
          onClick={() => setShowSOS(!showSOS)}
          className="flex items-center gap-1.5 rounded-full bg-destructive/90 px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-destructive"
        >
          <AlertTriangle className="h-4 w-4" />
          Emergency/SOS
        </button>
      </div>

      {/* SOS panel */}
      {showSOS && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          className="mx-4 mt-2 overflow-hidden rounded-xl border border-destructive/30 bg-destructive/10 p-3"
        >
          <p className="mb-2 text-xs font-semibold text-destructive">
            Emergency contacts
          </p>
          <a
            href="tel:999"
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-foreground transition-colors hover:bg-destructive/10"
          >
            <Phone className="h-4 w-4 text-destructive" />
            Call Emergency Services (999)
          </a>
          <a
            href="tel:112"
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-foreground transition-colors hover:bg-destructive/10"
          >
            <Phone className="h-4 w-4 text-destructive" />
            Call Police (112)
          </a>
        </motion.div>
      )}

      {/* Map */}
      <div className="mx-4 mt-3 overflow-hidden rounded-2xl" style={{ height: 280 }}>
        <RideMap pickup={ride.pickup} destination={ride.destination} className="!h-full" />
      </div>

      {/* Distance + Time stats — prominent */}
      {(distKm || etaMin) && (
        <div className="mx-4 mt-3 grid grid-cols-2 gap-2">
          <div className="flex items-center gap-3 rounded-xl bg-surface-2 px-4 py-3">
            <Route className="h-5 w-5 text-accent" />
            <div>
              <p className="font-display text-xl font-bold text-foreground">
                {distKm ?? "—"} <span className="text-sm text-muted-foreground">km</span>
              </p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Distance
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl bg-surface-2 px-4 py-3">
            <Clock className="h-5 w-5 text-accent" />
            <div>
              <p className="font-display text-xl font-bold text-foreground">
                ~{etaMin ?? "—"} <span className="text-sm text-muted-foreground">min</span>
              </p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Time left
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Status + destination */}
      <div className="px-4 pt-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-accent">
          {STATUS_LABEL[ride.status] ?? "RIDE ACTIVE"}
        </p>
        <p className="mt-1 font-display text-lg font-bold text-foreground">
          {STATUS_DESC[ride.status]?.(ride) ?? ride.destination}
        </p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
          <motion.div
            className="h-full rounded-full bg-accent"
            initial={{ width: "10%" }}
            animate={{
              width:
                ride.status === "requested"
                  ? "20%"
                  : ride.status === "accepted"
                    ? "50%"
                    : "75%",
            }}
            transition={{ duration: 1.5 }}
          />
        </div>
      </div>

      {/* Driver info — real or mock */}
      {showDriver ? (
        <div className="mx-4 mt-4 flex items-center gap-3 rounded-2xl border border-border bg-surface-2/40 p-3">
          <Avatar name={driver.name} size={48} />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-foreground">{driver.name}</p>
            <p className="text-xs text-muted-foreground">
              {realDriver?.vehicle_type ?? MOCK_DRIVER.vehicle_type}
            </p>
            <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="text-warning">★</span>
              <span>{MOCK_DRIVER.rating}</span>
              <span className="text-border">·</span>
              <span>{MOCK_DRIVER.rides.toLocaleString()}+ rides</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="grid h-10 w-10 place-items-center rounded-xl border border-border bg-surface-2 text-muted-foreground transition-colors hover:text-foreground">
              <MessageCircle className="h-4 w-4" />
            </button>
            <a
              href={`tel:${realDriver?.phone ?? MOCK_DRIVER.phone}`}
              className="grid h-10 w-10 place-items-center rounded-xl border border-border bg-surface-2 text-muted-foreground transition-colors hover:text-foreground"
            >
              <Phone className="h-4 w-4" />
            </a>
          </div>
        </div>
      ) : (
        <div className="mx-4 mt-4 flex items-center gap-3 rounded-2xl border border-border bg-surface-2/40 p-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-accent/10">
            <Car className="h-6 w-6 text-accent animate-pulse-dot" />
          </span>
          <div>
            <p className="font-semibold text-foreground">
              Looking for your driver...
            </p>
            <p className="text-xs text-muted-foreground">
              Available drivers are being notified
            </p>
          </div>
        </div>
      )}

      {/* Plate number */}
      {showDriver && (
        <div className="mx-4 mt-2 flex justify-center">
          <span className="rounded-lg border border-accent/20 bg-surface-2 px-4 py-1.5 font-mono text-sm font-bold tracking-wider text-accent">
            {realDriver?.plate_number ?? MOCK_DRIVER.plate_number}
          </span>
        </div>
      )}

      {/* Verification code */}
      {(ride.status === "requested" || ride.status === "accepted") && (
        <div className="mx-4 mt-3 flex items-center justify-between gap-3 rounded-xl border border-accent/30 bg-primary-soft px-3.5 py-2.5">
          <span className="flex items-center gap-2 text-xs leading-tight text-muted-foreground">
            <ShieldCheck className="h-4 w-4 shrink-0 text-accent" />
            {ride.status === "requested"
              ? "Your ride code"
              : "Share with driver at pickup"}
          </span>
          <span className="font-display text-xl font-bold tracking-[0.3em] tabular-nums text-foreground">
            {ride.verification_code}
          </span>
        </div>
      )}

      {/* Payment status for in_progress */}
      {ride.status === "in_progress" && ride.payment_status === "pending" && (
        <div className="mx-4 mt-3 flex items-center gap-2 rounded-xl border border-warning/25 bg-warning/10 px-3.5 py-2.5 text-sm text-warning">
          <Clock className="h-4 w-4" />
          Enter your M-Pesa PIN to pay {formatKES(ride.budget)}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 p-4">
        <button className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-border bg-surface-2/40 py-3 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground">
          <Share2 className="h-4 w-4" />
          Share Status
        </button>
        {canCancel && (
          <Button
            variant="destructive"
            fullWidth
            loading={cancelLoading}
            onClick={onCancel}
            className="flex-1"
          >
            <XCircle className="h-4 w-4" />
            Cancel Trip
          </Button>
        )}
      </div>
    </motion.div>
  );
}
