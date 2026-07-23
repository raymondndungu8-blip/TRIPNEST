"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/providers/session-provider";
import Slideshow from "@/components/ui/slideshow";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/brand/logo";

export default function LandingPage() {
  const router = useRouter();
  const { user, client, driver, loading } = useSession();

  // Auto-redirect logged-in users to their dashboard
  useEffect(() => {
    if (loading) return;
    if (client) { router.replace("/client"); return; }
    if (driver) { router.replace("/driver"); return; }
    if (user) { router.replace("/auth/callback"); return; }
  }, [loading, user, client, driver, router]);

  function handleClient() {
    if (loading) return;
    router.push("/client");
  }

  function handleDriver() {
    if (loading) return;
    router.push(driver ? "/driver" : "/signup/driver");
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background">
      {/* Background Slideshow */}
      <Slideshow />

      {/* Main Content Overlay */}
      <div className="pointer-events-none relative z-10 flex min-h-screen flex-col justify-between px-5 py-7 sm:px-6 md:px-12 md:py-12">
        {/* Top Header */}
        <div className="pointer-events-auto flex w-full items-center justify-between">
          <div className="flex items-center gap-2">
            <LogoMark size={28} className="drop-shadow-[0_0_15px_rgba(0,212,255,0.5)]" />
            <span className="font-display text-sm font-semibold tracking-wider text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
              TRIPNEST
            </span>
          </div>
          <span className="font-display text-[10px] font-bold uppercase tracking-[0.2em] text-accent drop-shadow-[0_2px_10px_rgba(0,0,0,0.85)]">
            TRIPNEST PLATFORM
          </span>
        </div>

        {/* Center spacing (since slide-text is centered behind this) */}
        <div className="flex-1" />

        {/* Bottom CTA Actions */}
        <div className="pointer-events-auto mx-auto w-full max-w-md pb-14 sm:pb-4">
          {/* Tagline / Subtitle from screenshot */}
          <div className="mb-5 space-y-1 text-center drop-shadow-[0_3px_14px_rgba(0,0,0,0.9)]">
            <h2 className="font-display text-[10px] font-bold uppercase tracking-[0.25em] text-accent">
              PRE-BOOK TRANSIT NETWORK
            </h2>
            <p className="text-[13px] font-medium text-white/90">
              &ldquo;Pre-book rides without waiting for cabs.&rdquo;
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Button
              size="lg"
              fullWidth
              onClick={handleClient}
              disabled={loading}
              className="h-12 rounded-full border border-cyan-200/35 bg-cyan-300/22 text-[13px] font-semibold uppercase tracking-wider text-white shadow-[0_10px_35px_rgba(0,212,255,0.28)] backdrop-blur-md transition-all hover:bg-cyan-300/32 hover:brightness-110 active:scale-[0.98]"
            >
              Book Ride &rarr;
            </Button>

            <Button
              variant="outline"
              size="lg"
              fullWidth
              onClick={handleDriver}
              disabled={loading}
              className="h-12 rounded-full border-white/25 bg-white/10 text-[13px] font-semibold uppercase tracking-wider text-white shadow-[0_10px_35px_rgba(0,0,0,0.28)] backdrop-blur-md transition-all hover:border-white/40 hover:bg-white/18 active:scale-[0.98]"
            >
              Become Driver
            </Button>
          </div>

          {/* Explore events indicator */}
          <div className="flex items-center justify-center gap-2 py-3 drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-medium tracking-wide text-white/75">
              Explore Events
            </span>
          </div>

          <div className="text-center drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
            <span className="text-[12px] font-medium text-white/70">
              Already registered?{" "}
              <button
                onClick={() => router.push("/login")}
                className="font-semibold text-accent transition-colors hover:underline"
              >
                Log In
              </button>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
