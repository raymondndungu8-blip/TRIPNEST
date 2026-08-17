"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/providers/session-provider";
import { DashboardSkeleton } from "@/components/ui/dashboard-skeleton";

export default function AuthCallbackPage() {
  const router = useRouter();
  const { loading, user, client, driver } = useSession();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (client) {
      router.replace("/client");
      return;
    }
    if (driver) {
      router.replace("/driver");
      return;
    }
    // No profile on record — the session provider provisions a client profile
    // automatically, so head straight for the client dashboard. If that
    // provisioning failed, the dashboard's RequireRole bounces back gracefully.
    router.replace("/client");
  }, [loading, user, client, driver, router]);

  return <DashboardSkeleton />;
}