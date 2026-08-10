import Link from "next/link";
import { LogoMark } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

export function LegalLayout({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            <LogoMark size={26} />
            <span className="font-display text-sm font-extrabold uppercase tracking-[0.16em]">
              TripNest
            </span>
          </Link>
          <nav className="ml-auto flex items-center gap-4 text-xs font-medium text-muted-foreground">
            <Link href="/legal/terms" className={cn("transition-colors hover:text-foreground")}>
              Terms
            </Link>
            <Link href="/legal/privacy" className="transition-colors hover:text-foreground">
              Privacy
            </Link>
            <Link href="/legal/cancellations" className="transition-colors hover:text-foreground">
              Cancellations
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
          Legal
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold">{title}</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">Last updated: {updated}</p>

        <div className="prose-invert mt-8 space-y-6 text-[15px] leading-relaxed">
          {children}
        </div>

        <footer className="mt-14 border-t border-border/60 pt-6 text-center text-xs text-muted-foreground">
          <LogoMark size={22} className="mx-auto opacity-80" />
          <p className="mt-3">
            TripNest Ltd · better the driver you know.
            <br /> Kenya · support@tripnest.app · © {new Date().getFullYear()} TripNest
          </p>
        </footer>
      </main>
    </div>
  );
}