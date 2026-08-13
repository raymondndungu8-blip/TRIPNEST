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
        "mx-auto w-full max-w-md px-3 pt-3",
        withNav ? "pb-24" : "pb-6",
        className
      )}
    >
      {children}
    </main>
  );
}
