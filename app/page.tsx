"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/providers/session-provider";
import { AppShell } from "@/components/layout/app-shell";
import { FadeIn } from "@/components/motion/motion";
import { Hero } from "@/components/landing/hero";
import { OnboardingCarousel } from "@/components/landing/onboarding-carousel";

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
    // Always go straight to the home page — RequireRole on /client will
    // bounce unauthenticated visitors to signup, and signup sends them
    // straight back home once their profile is created.
    router.push("/client");
  }

  function handleDriver() {
    if (loading) return;
    router.push(driver ? "/driver" : "/signup/driver");
  }

  return (
    <AppShell withNav={false} className="pt-10">
      <Hero loading={loading} onClient={handleClient} onDriver={handleDriver} />

      <FadeIn delay={0.4} className="mt-10">
        <OnboardingCarousel />
      </FadeIn>

      <FadeIn delay={0.55}>
        <div className="mt-16 flex items-center justify-between text-[11px] text-muted-foreground/50">
          <span>v0.2.0 &middot; Prototype</span>
          <span>&copy; TRIPNEST</span>
        </div>
      </FadeIn>
    </AppShell>
  );
}
