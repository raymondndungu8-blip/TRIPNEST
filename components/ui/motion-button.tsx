"use client";

import { ArrowRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  label: string;
  /** Shown while `loading` is true (e.g. "Booking…"). Defaults to `label`. */
  loadingLabel?: string;
  variant?: "primary" | "secondary";
  classes?: string;
  animate?: boolean;
  delay?: number;
  type?: "button" | "submit";
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
}

/**
 * Morphing pill button: a circle that expands to fill the button on hover,
 * the label flips contrast as the brand color sweeps in.
 */
const MotionButton: React.FC<Props> = ({
  label,
  loadingLabel,
  variant = "primary",
  classes,
  animate = true,
  delay = 0,
  type = "button",
  onClick,
  disabled = false,
  loading = false,
}) => {
  const isPrimary = variant === "primary";
  const busy = loading || disabled;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={busy}
      style={animate && delay ? { transitionDelay: `${delay}ms` } : undefined}
      className={cn(
        "group relative h-auto w-full cursor-pointer rounded-full p-1 outline-none",
        "transition-all duration-500 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:cursor-not-allowed disabled:opacity-60",
        classes
      )}
    >
      {/* Expanding circle */}
      <span
        className={cn(
          "block h-12 w-12 overflow-hidden rounded-full duration-500 group-hover:w-full",
          isPrimary ? "bg-primary" : "bg-surface-2",
          busy && "animate-pulse"
        )}
        aria-hidden="true"
      />

      {/* Icon / spinner */}
      <div
        className={cn(
          "absolute left-4 top-1/2 -translate-y-1/2 duration-500 group-hover:translate-x-[0.4rem]",
          isPrimary ? "text-background" : "text-foreground"
        )}
      >
        {loading ? (
          <Loader2 className="h-6 w-6 animate-spin" />
        ) : (
          <ArrowRight className="h-6 w-6" />
        )}
      </div>

      {/* Label */}
      <span
        className={cn(
          "absolute left-1/2 top-1/2 ml-4 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-center text-lg font-medium tracking-tight duration-500",
          isPrimary
            ? "text-foreground group-hover:text-background"
            : "text-foreground"
        )}
      >
        {loading && loadingLabel ? loadingLabel : label}
      </span>
    </button>
  );
};

export default MotionButton;
