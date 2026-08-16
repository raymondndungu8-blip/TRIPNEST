import { cn } from "@/lib/utils";

export function SectionTitle({
  children,
  action,
  className,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-3 mt-6 flex items-center justify-between", className)}>
      <h2 className="text-sm font-semibold uppercase tracking-label text-muted-foreground">
        {children}
      </h2>
      {action}
    </div>
  );
}
