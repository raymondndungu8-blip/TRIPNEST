"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { FullPageSpinner } from "@/components/ui/spinner";

export default function AuthCallbackPage() {
  const router = useRouter();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    async function handle() {
      // PKCE flow uses ?code=, implicit flow uses #access_token (auto-detected)
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      if (code) {
        await supabase.auth.exchangeCodeForSession(code);
      }

      // Poll briefly for the session to settle.
      let session = null;
      for (let i = 0; i < 6; i++) {
        const { data } = await supabase.auth.getSession();
        session = data.session;
        if (session) break;
        await new Promise((r) => setTimeout(r, 300));
      }

      if (!session?.user) {
        router.replace("/login");
        return;
      }

      const userId = session.user.id;

      // A DB trigger auto-creates the client row the instant the auth user
      // is created — just poll briefly for it to land, then go home.
      for (let i = 0; i < 8; i++) {
        const { data: clientRow } = await supabase
          .from("clients")
          .select("id")
          .eq("user_id", userId)
          .maybeSingle();
        if (clientRow) {
          router.replace("/client");
          return;
        }
        const { data: driverRow } = await supabase
          .from("drivers")
          .select("id")
          .eq("user_id", userId)
          .maybeSingle();
        if (driverRow) {
          router.replace("/driver");
          return;
        }
        await new Promise((r) => setTimeout(r, 300));
      }

      // Trigger should have handled it; if not, send to signup as fallback.
      router.replace("/signup/client");
    }

    handle().catch(() => router.replace("/login"));
  }, [router]);

  return <FullPageSpinner label="Signing you in…" />;
}
