import { cn } from "@/lib/utils";

/** TripNest brand mark — two crossed blades forming an "N", in a cyan/teal gradient. */
export function LogoMark({
  size = 32,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="TripNest"
      style={{ filter: "drop-shadow(0 2px 10px rgba(0,212,255,0.45))" }}
    >
      <defs>
        <linearGradient id="tnBladeA" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#0891b2" />
          <stop offset="1" stopColor="#00d4ff" />
        </linearGradient>
        <linearGradient id="tnBladeB" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#67e8f9" />
          <stop offset="0.5" stopColor="#22d3ee" />
          <stop offset="1" stopColor="#06b6d4" />
        </linearGradient>
      </defs>
      {/* back blade: bottom-left tail → top-right point */}
      <path
        d="M9 47 C 13 31 21 18 35 7 C 30 25 25 35 21 47 C 17 48 12 48 9 47 Z"
        fill="url(#tnBladeA)"
      />
      {/* front blade: top-left point → bottom-right tail */}
      <path
        d="M39 47 C 35 31 27 18 13 7 C 18 25 23 35 27 47 C 31 48 36 48 39 47 Z"
        fill="url(#tnBladeB)"
      />
      {/* bright core where the blades cross */}
      <path
        d="M24 20 C 26.5 22.5 26.5 25.5 24 28 C 21.5 25.5 21.5 22.5 24 20 Z"
        fill="#cffafe"
        opacity="0.85"
      />
    </svg>
  );
}

export function Logo({
  className,
  showWord = true,
  tagline = false,
  size = 30,
}: {
  className?: string;
  showWord?: boolean;
  tagline?: boolean;
  size?: number;
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <LogoMark size={size} />
      {showWord && (
        <div className="flex flex-col justify-center leading-none">
          <span className="font-display text-[1.05rem] font-extrabold uppercase tracking-[0.16em] text-foreground">
            TripNest
          </span>
          {tagline && (
            <span className="mt-1 text-[0.7rem] font-medium lowercase tracking-wide text-accent">
              better the driver you know.
            </span>
          )}
        </div>
      )}
    </div>
  );
}
