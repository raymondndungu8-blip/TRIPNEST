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
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        className={cn(
          "shrink-0 rounded-full object-cover",
          className
        )}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-brand-gradient font-display text-sm font-semibold text-white",
        className
      )}
      style={{ width: size, height: size }}
      aria-hidden
    >
      {initials(name || "?")}
    </span>
  );
}
