"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/brand/logo";
import { Spinner } from "@/components/ui/spinner";

const spring = { type: "spring" as const, stiffness: 120, damping: 16 };

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: spring },
};

export function Hero({
  loading,
  onClient,
  onDriver,
}: {
  loading: boolean;
  onClient: () => void;
  onDriver: () => void;
}) {
  return (
    <section className="relative flex min-h-[70dvh] flex-col items-center justify-center">
      {/* Hero background image */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -mx-4 -mt-10 overflow-hidden"
      >
        <img
          src="/images/hero-welcome.png"
          alt=""
          className="h-full w-full object-cover opacity-40"
        />
        {/* Dark gradient overlays for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--background)] via-[var(--background)]/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--background)]/50 to-transparent" />
        <div className="absolute inset-0 bg-[var(--background)]/20" />
      </div>

      {/* Layered cyan glow behind the logo */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500/20 blur-[100px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/15 blur-[60px]"
      />

      <motion.div
        initial="hidden"
        animate="show"
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
        }}
        className="relative flex flex-col items-center text-center"
      >
        {/* TRIPNEST wordmark */}
        <motion.span
          variants={item}
          className="font-display text-[0.8rem] font-bold uppercase tracking-[0.3em] text-muted-foreground/70"
        >
          TripNest
        </motion.span>

        {/* Large glowing logo icon */}
        <motion.div variants={item} className="mt-8">
          <LogoMark size={64} className="drop-shadow-[0_0_30px_rgba(56,189,248,0.5)]" />
        </motion.div>

        {/* Tagline */}
        <motion.p
          variants={item}
          className="mt-8 font-display text-lg font-medium tracking-wide text-accent"
        >
          better the driver you know.
        </motion.p>

        {/* Subtitle */}
        <motion.p
          variants={item}
          className="mt-3 max-w-[280px] text-[14px] leading-relaxed text-muted-foreground/70"
        >
          Exclusivity and security for the
          <br />
          sophisticated traveler.
        </motion.p>

        {/* Primary CTA */}
        <motion.div variants={item} className="mt-10 w-full max-w-xs">
          <Button
            size="lg"
            fullWidth
            onClick={onClient}
            disabled={loading}
            aria-label="Get started"
          >
            {loading ? (
              <Spinner className="h-5 w-5 text-primary-foreground" />
            ) : (
              <>
                Get Started
                <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden />
              </>
            )}
          </Button>
        </motion.div>

        {/* Secondary driver link */}
        <motion.button
          variants={item}
          onClick={onDriver}
          disabled={loading}
          className="mt-4 text-[13px] font-medium text-muted-foreground transition-colors hover:text-accent disabled:pointer-events-none disabled:opacity-50"
        >
          Join as a Driver <span aria-hidden>&rarr;</span>
        </motion.button>
      </motion.div>
    </section>
  );
}
