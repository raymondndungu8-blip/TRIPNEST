"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

export function PageHeader({
  title,
  subtitle,
  back = false,
  action,
}: {
  title: string;
  subtitle?: string;
  back?: boolean;
  action?: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <header className="mb-3 flex items-start justify-between gap-2">
      <div className="flex items-start gap-2">
        {back && (
          <button
            onClick={() => router.back()}
            aria-label="Go back"
            className="mt-0.5 grid h-8 w-8 place-items-center rounded-lg border border-border bg-surface-2/60 text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronLeft className="h-[18px] w-[18px]" />
          </button>
        )}
        <div>
          <h1 className="font-display text-xl font-bold tracking-tight text-foreground">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </div>
      {action}
    </header>
  );
}
