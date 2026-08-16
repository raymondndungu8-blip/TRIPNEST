"use client";

import { useEffect, useRef, useState } from "react";
import { playRequestChime } from "@/lib/alert-sound";
import type { RideWithRelations } from "@/lib/types";

/**
 * Watches the live open-request feed and alerts the driver the moment a NEW
 * request arrives (skipping the initial load). Returns the alert object so
 * the dashboard can render an overlay banner while it's active.
 */
export function useRequestAlert(
  requests: RideWithRelations[]
): { alert: RideWithRelations | null; dismiss: () => void } {
  const seenRef = useRef<Set<string>>(new Set());
  const firstRender = useRef(true);
  const [alert, setAlert] = useState<RideWithRelations | null>(null);

  useEffect(() => {
    const ids = requests.map((r) => r.id);

    if (firstRender.current) {
      firstRender.current = false;
      ids.forEach((id) => seenRef.current.add(id));
      return;
    }

    const brandNew = requests.filter((r) => !seenRef.current.has(r.id));
    if (brandNew.length === 0) return;

    brandNew.forEach((r) => seenRef.current.add(r.id));
    const latest = brandNew[0];
    playRequestChime();
    setAlert(latest);

    // Auto-dismiss the overlay after 8s so it never blocks the feed.
    const t = setTimeout(() => setAlert(null), 8000);
    return () => clearTimeout(t);
  }, [requests]);

  // When the alert's ride is gone (accepted/expired elsewhere) dismiss it.
  useEffect(() => {
    if (!alert) return;
    if (!requests.some((r) => r.id === alert.id)) setAlert(null);
  }, [requests, alert]);

  return { alert, dismiss: () => setAlert(null) };
}
