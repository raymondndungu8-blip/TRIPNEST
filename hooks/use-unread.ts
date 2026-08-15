"use client";

import { useEffect, useState } from "react";
import { onSnapshot, query, where } from "firebase/firestore";
import { collections } from "@/lib/db";

/**
 * Live count of unread (incoming, unseen) messages for a user.
 *
 * For a client, incoming messages are `senderType === "driver"` in threads
 * where they are the client. For a driver, incoming are `senderType ===
 * "client"`. Only messages with `read !== true` count; legacy docs without a
 * `read` field are treated as read.
 */
export function useUnreadCount(
  role: "client" | "driver",
  userId: string
): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!userId) {
      setCount(0);
      return;
    }

    const base =
      role === "client"
        ? [where("clientId", "==", userId), where("senderType", "==", "driver")]
        : [where("driverId", "==", userId), where("senderType", "==", "client")];

    const q = query(collections.messages(), ...base);

    const unsub = onSnapshot(
      q,
      (snap) => {
        let c = 0;
        snap.docs.forEach((d) => {
          if (d.data().read !== true) c++;
        });
        setCount(c);
      },
      () => setCount(0)
    );

    return unsub;
  }, [role, userId]);

  return count;
}
