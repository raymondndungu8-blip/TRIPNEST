"use client";

import { useEffect, useRef } from "react";
import { useSession } from "@/components/providers/session-provider";
import { subscribeToPush, unsubscribeFromPush } from "@/lib/push";

/**
 * Keeps the current device's push subscription in sync with the signed-in
 * user: subscribes (and persists to Firestore) when a user is active, and
 * clears it on logout so the server never pushes to a stale device.
 */
export function PushSubscriptionProvider() {
  const { user, client, driver, loading } = useSession();
  const previousUid = useRef<string | null>(null);

  useEffect(() => {
    if (loading) return;
    const uid = user?.uid ?? null;

    if (uid === previousUid.current) return;
    previousUid.current = uid;

    if (!uid) {
      unsubscribeFromPush(previousUid.current ?? "").catch(() => undefined);
      return;
    }

    const role: "client" | "driver" = driver ? "driver" : client ? "client" : "client";
    subscribeToPush(uid, role)
      .then((ok) => {
        if (!ok) console.info("[push] device not subscribed");
      })
      .catch((err) => console.warn("[push] subscribe failed", err));
  }, [user, client, driver, loading]);

  return null;
}