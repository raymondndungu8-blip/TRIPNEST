"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { fadeUp } from "@/components/motion/motion";

export function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <motion.div variants={fadeUp} className="card flex flex-col gap-2 p-4">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary-soft">
        <Icon className="h-4 w-4 text-accent" />
      </span>
      <div className="leading-tight">
        <p className="font-display text-xl font-bold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </motion.div>
  );
}
