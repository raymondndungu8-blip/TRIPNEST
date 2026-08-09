"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getDocument, docs } from "@/lib/db";
import { FullPageSpinner } from "@/components/ui/spinner";
import type { Client, Driver } from "@/lib/types";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    let active = true;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!active) return;
      if (!user) {
        router.replace("/login");
        return;
      }

      let c: Client | null = null;
      let d: Driver | null = null;
      try {
        [c, d] = await Promise.all([
          getDocument<Client>(docs.client(user.uid)),
          getDocument<Driver>(docs.driver(user.uid)),
        ]);
      } catch (err) {
        console.error("[auth/callback] profile read failed", err);
      }
      if (!active) return;

      if (c) router.replace("/client");
      else if (d) router.replace("/driver");
      else router.replace("/signup/client");
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [router]);

  return <FullPageSpinner label="Signing you in…" />;
}