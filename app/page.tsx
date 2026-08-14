"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { useSession } from "@/components/providers/session-provider";
import Slideshow, { slides, type TripNestSlide } from "@/components/ui/slideshow";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/brand/logo";

export default function LandingPage() {
  const router = useRouter();
  const { user, client, driver, loading } = useSession();
  const [activeSlide, setActiveSlide] = useState<TripNestSlide>(slides[0]);

  const handleSlideChange = useCallback((slide: TripNestSlide) => {
    setActiveSlide(slide);
  }, []);

  useEffect(() => {
    if (loading) return;
    if (client) {
      router.replace("/client");
      return;
    }
    if (driver) {
      router.replace("/driver");
      return;
    }
    if (user) router.replace("/auth/callback");
  }, [loading, user, client, driver, router]);

  function handleClient() {
    if (!loading) router.push("/client");
  }

  function handleDriver() {
    if (!loading) router.push(driver ? "/driver" : "/signup/driver");
  }

  return (
    <main className="tripnest-mobile-app">
      <section className="tripnest-mobile-screen">
        <div className="tripnest-mobile-hero">
          <Slideshow onSlideChange={handleSlideChange} />
          <div className="tripnest-mobile-overlay" aria-hidden="true" />

          <div className="tripnest-mobile-header">
            <div className="flex items-center gap-2.5">
              <LogoMark
                size={28}
                className="drop-shadow-[0_0_14px_rgba(0,212,255,0.5)]"
              />
              <span className="font-display text-[13px] font-bold tracking-[0.18em] text-white">
                TRIPNEST
              </span>
            </div>
          </div>

          <div
            key={activeSlide.img}
            className="tripnest-mobile-hero-copy tripnest-copy-transition"
          >
            <h1 className="font-display text-[1.58rem] font-extrabold leading-[1.04] tracking-[-0.025em] text-white sm:text-[1.7rem]">
              {activeSlide.title}
              <span className="block text-[#7dd3fc]">{activeSlide.accent}</span>
            </h1>
            <p className="mt-2 max-w-[16rem] text-[12px] leading-[1.45] text-white/78">
              {activeSlide.description}
            </p>
          </div>

          <div className="tripnest-mobile-sheet">
            <div className="grid gap-2">
              <Button
                size="lg"
                fullWidth
                onClick={handleClient}
                disabled={loading}
                className="mx-auto h-9 w-full max-w-[20rem] rounded-full border border-[#7dd3fc]/60 bg-[#0ea5e9] text-[10px] font-bold uppercase tracking-[0.075em] text-white shadow-[0_7px_18px_rgba(14,165,233,0.24)] transition-transform duration-200 hover:bg-[#38bdf8] active:scale-[0.98]"
              >
                Find your ride
                <ArrowRight className="ml-1 h-3 w-3" aria-hidden />
              </Button>
              <Button
                variant="outline"
                size="lg"
                fullWidth
                onClick={handleDriver}
                disabled={loading}
                className="mx-auto h-9 w-full max-w-[20rem] rounded-full border-white/25 bg-black/25 text-[10px] font-semibold uppercase tracking-[0.065em] text-white backdrop-blur-md transition-transform duration-200 hover:border-white/40 hover:bg-black/35 active:scale-[0.98]"
              >
                Become a driver
              </Button>
            </div>

            <p className="mt-3 text-center text-[10px] text-white/60">
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => router.push("/login")}
                className="font-semibold text-[#7dd3fc] transition-colors hover:text-white"
              >
                Sign in
              </button>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
