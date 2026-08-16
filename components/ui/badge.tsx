import { cn } from "@/lib/utils";
import type { RideStatus, VehicleCategory, RideType } from "@/lib/types";

type Tone = "blue" | "green" | "amber" | "red" | "slate" | "violet" | "verified";

const TONES: Record<Tone, string> = {
  blue: "bg-primary-soft text-accent border-accent/20",
  green: "bg-success-soft text-success border-success/25",
  amber: "bg-warning/15 text-warning border-warning/25",
  red: "bg-destructive/15 text-destructive border-destructive/25",
  slate: "bg-surface-2/80 text-muted-foreground border-border",
  violet: "bg-violet-500/15 text-violet-300 border-violet-400/25",
  verified: "bg-success-soft text-verified border-success/25",
};

const DOT_TONE: Record<Tone, string> = {
  blue: "text-accent",
  green: "text-success",
  amber: "text-warning",
  red: "text-destructive",
  slate: "text-muted-foreground",
  violet: "text-violet-400",
  verified: "text-verified",
};

export function Badge({
  tone = "slate",
  dot = false,
  className,
  children,
}: {
  tone?: Tone;
  dot?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-tight",
        TONES[tone],
        className
      )}
    >
      {dot && <span aria-hidden className={cn("status-dot", DOT_TONE[tone])} />}
      {children}
    </span>
  );
}

const STATUS_TONE: Record<RideStatus, Tone> = {
  requested: "amber",
  accepted: "green",
  in_progress: "violet",
  rejected: "red",
  completed: "blue",
  cancelled: "slate",
};

const STATUS_LABEL: Record<RideStatus, string> = {
  requested: "Searching driver",
  accepted: "Accepted",
  in_progress: "In progress",
  rejected: "Rejected",
  completed: "Completed",
  cancelled: "Cancelled",
};

export function StatusBadge({ status }: { status: RideStatus }) {
  // Live / attention states carry a pulsing status dot; terminal states are calm.
  const live = status === "requested" || status === "accepted" || status === "in_progress";
  return (
    <Badge tone={STATUS_TONE[status]} dot={live}>
      {STATUS_LABEL[status]}
    </Badge>
  );
}

const CATEGORY_LABEL: Record<VehicleCategory, string> = {
  standard: "Standard",
  xl: "XL",
  premium: "Premium",
};

export function CategoryBadge({ category }: { category: VehicleCategory }) {
  return (
    <Badge tone={category === "premium" ? "violet" : "slate"}>
      {CATEGORY_LABEL[category]}
    </Badge>
  );
}

export function RideTypeBadge({
  type,
  passengers,
}: {
  type: RideType;
  passengers?: number;
}) {
  return (
    <Badge tone={type === "cost_sharing" ? "green" : "blue"}>
      {type === "cost_sharing"
        ? `Cost sharing${passengers && passengers > 1 ? ` · ${passengers} people` : ""}`
        : "Private"}
    </Badge>
  );
}
