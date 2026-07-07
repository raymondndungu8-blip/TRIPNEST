"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/providers/session-provider";
import { FullPageSpinner } from "@/components/ui/spinner";
import type { Role } from "@/lib/types";

/**
 * Wrap a dashboard page. Redirects to the matching signup if the visitor
 * has not registered as that role yet.
 */
export function RequireRole({
  role,
  children,
}: {
  role: Role;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { loading, client, driver } = useSession();
  const record = role === "client" ? client : driver;

  useEffect(() => {
    if (!loading && !record) {
      router.replace(`/signup/${role}`);
    }
  }, [loading, record, role, router]);

  if (loading) return <FullPageSpinner label="Loading your account…" />;
  if (!record) return <FullPageSpinner label="Redirecting…" />;
  return <>{children}</>;
}
