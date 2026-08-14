import { cn } from "@/lib/utils";

const LOGO_SRC = "/images/tripnest-logo.png";

/** Shared TripNest mark using the current blue communicating logo artwork. */
export function LogoMark({
  size = 32,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={LOGO_SRC}
      width={size}
      height={size}
      className={cn("object-contain", className)}
      role="img"
      aria-label="TripNest"
      alt="TripNest"
      style={{ filter: "drop-shadow(0 2px 10px rgba(0, 140, 255, 0.38))" }}
    />
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
              Better the driver you know.
            </span>
          )}
        </div>
      )}
    </div>
  );
}
