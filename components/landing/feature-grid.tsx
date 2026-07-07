"use client";

import {
  CalendarClock,
  Plane,
  Ticket,
  Users,
  Heart,
  type LucideIcon,
} from "lucide-react";
import { motion } from "framer-motion";
import { staggerContainer, fadeUp } from "@/components/motion/motion";

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
}

const FEATURES: Feature[] = [
  {
    icon: CalendarClock,
    title: "Scheduled rides",
    description: "Pre-order a driver for the exact time you need.",
  },
  {
    icon: Plane,
    title: "Airport pickups",
    description: "Land and ride — your driver is already waiting.",
  },
  {
    icon: Ticket,
    title: "Event travel",
    description: "Book transport straight to festivals & nights out.",
  },
  {
    icon: Users,
    title: "Shared rides for less",
    description: "Split the trip and the cost with others.",
  },
  {
    icon: Heart,
    title: "Favorite drivers",
    description: "Save the drivers you trust and rebook in a tap.",
  },
];

export function FeatureGrid() {
  return (
    <motion.ul
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 gap-2.5"
    >
      {FEATURES.map((f) => {
        const Icon = f.icon;
        return (
          <motion.li
            key={f.title}
            variants={fadeUp}
            className="glass flex items-center gap-3.5 rounded-2xl p-3.5"
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-soft">
              <Icon className="h-5 w-5 text-accent" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="font-display text-sm font-semibold text-foreground">
                {f.title}
              </p>
              <p className="text-xs leading-snug text-muted-foreground">
                {f.description}
              </p>
            </div>
          </motion.li>
        );
      })}
    </motion.ul>
  );
}
