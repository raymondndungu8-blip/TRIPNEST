"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { patchDocument, docs } from "@/lib/db";
import { useSession } from "@/components/providers/session-provider";
import { useToast } from "@/components/providers/toast-provider";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { Driver } from "@/lib/types";

export function AvailabilityCard({ driver }: { driver: Driver }) {
  const { refreshDriver } = useSession();
  const { toast } = useToast();
  const [updating, setUpdating] = useState(false);
  const online = driver.is_available;

  async function handleToggle(next: boolean) {
    if (updating) return;
    setUpdating(true);
    try {
      await patchDocument(docs.driver(driver.id), { isAvailable: next });
      await refreshDriver();
      toast(
        next ? "You're online — requests incoming" : "You're now offline",
        next ? "success" : "info"
      );
    } catch (err) {
      console.error("[availability] toggle failed", err);
      toast("Could not update availability. Try again.", "error");
    } finally {
      setUpdating(false);
    }
  }

  return (
    <motion.div
      layout
      className={cn(
        "card flex items-center justify-between gap-4 p-5 transition-colors",
        online && "border-success/30"
      )}
    >
      <div className="flex items-start gap-3">
        <span className="relative mt-1 flex h-3 w-3 shrink-0">
          {online && (
            <span className="absolute inline-flex h-3 w-3 animate-pulse-dot rounded-full bg-success" />
          )}
          <span
            className={cn(
              "relative inline-flex h-3 w-3 rounded-full",
              online ? "bg-success" : "bg-muted-foreground/40"
            )}
          />
        </span>
        <div className="leading-tight">
          <p className="font-display text-base font-semibold text-foreground">
            {online ? "You're online" : "You're offline"}
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {online
              ? "Receiving ride requests in real time."
              : "Go online to start receiving requests."}
          </p>
        </div>
      </div>
      <Switch
        checked={online}
        onChange={handleToggle}
        disabled={updating}
        label="Toggle availability"
      />
    </motion.div>
  );
}
