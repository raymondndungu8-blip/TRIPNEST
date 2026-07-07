"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  description?: string;
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  name,
  columns,
}: {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  name: string;
  columns?: number;
}) {
  return (
    <div
      role="radiogroup"
      className={cn("grid gap-2")}
      style={{ gridTemplateColumns: `repeat(${columns ?? options.length}, minmax(0, 1fr))` }}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "relative flex flex-col items-start gap-0.5 rounded-xl border px-3.5 py-3 text-left transition-colors duration-200",
              active
                ? "border-accent/50 text-foreground"
                : "border-border bg-surface-2/40 text-muted-foreground hover:text-foreground"
            )}
          >
            {active && (
              <motion.span
                layoutId={`seg-${name}`}
                className="absolute inset-0 -z-10 rounded-xl bg-primary-soft"
                transition={{ type: "spring", stiffness: 350, damping: 30 }}
              />
            )}
            <span className="text-sm font-semibold">{opt.label}</span>
            {opt.description && (
              <span className="text-xs leading-tight opacity-80">
                {opt.description}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
