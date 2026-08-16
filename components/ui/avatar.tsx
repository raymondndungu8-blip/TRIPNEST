import { cn } from "@/lib/utils";
import { initials } from "@/lib/utils";

export function Avatar({
  name,
  src,
  className,
  size = 40,
}: {
  name: string;
  src?: string | null;
  className?: string;
  size?: number;
}) {
  const ring = "ring-2 ring-white/10 ring-offset-2 ring-offset-background";
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        className={cn("shrink-0 rounded-full object-cover", ring, className)}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-brand-gradient font-display text-sm font-semibold text-primary-foreground",
        ring,
        className
      )}
      style={{ width: size, height: size }}
      aria-hidden
    >
      {initials(name || "?")}
    </span>
  );
}
