import { cn } from "@/lib/utils";

/** Mobile-first centered column with safe bottom padding for the nav bar. */
export function AppShell({
  children,
  className,
  withNav = true,
}: {
  children: React.ReactNode;
  className?: string;
  withNav?: boolean;
}) {
  return (
    <main
      className={cn(
        "mx-auto w-full max-w-md px-4 pt-5",
        withNav ? "pb-28" : "pb-8",
        className
      )}
    >
      {children}
    </main>
  );
}
