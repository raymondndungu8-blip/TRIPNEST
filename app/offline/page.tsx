import Link from "next/link";
import { LogoMark } from "@/components/brand/logo";

export const metadata = {
  title: "You're offline — TripNest",
};

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      <LogoMark size={48} className="opacity-90" />
      <h1 className="mt-6 font-display text-2xl font-semibold text-white">
        You&rsquo;re offline
      </h1>
      <p className="mt-2 max-w-xs text-sm text-muted-foreground">
        Reconnect to load the latest rides, drivers and messages. Your booked
        trips stay safe and will sync as soon as you&rsquo;re back online.
      </p>
      <Link
        href="/"
        className="mt-8 rounded-full border border-accent/30 bg-accent/10 px-6 py-2.5 text-sm font-semibold text-accent transition-colors hover:bg-accent/20"
      >
        Try again
      </Link>
    </div>
  );
}