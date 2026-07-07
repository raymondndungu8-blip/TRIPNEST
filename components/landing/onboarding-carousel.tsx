"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, type PanInfo } from "framer-motion";
import {
  CalendarClock,
  CalendarHeart,
  Plane,
  MessageCircle,
  Heart,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Slide {
  icon: LucideIcon;
  title: string;
  description: string;
}

const SLIDES: Slide[] = [
  {
    icon: CalendarClock,
    title: "Book & schedule rides",
    description:
      "Ride now or plan ahead. Pick your vehicle, set your budget, and confirm in seconds.",
  },
  {
    icon: CalendarHeart,
    title: "Book rides to events",
    description:
      "Heading to a festival or a night out? Book transport straight to the venue — solo or shared.",
  },
  {
    icon: Plane,
    title: "Airport transfers",
    description:
      "See upcoming flight departures and book a pickup timed to your exact flight.",
  },
  {
    icon: MessageCircle,
    title: "Chat with your drivers",
    description:
      "Message favorite drivers and anyone you've ridden with from your Inbox to coordinate pickups.",
  },
  {
    icon: Heart,
    title: "Save favorite drivers",
    description:
      "Tap the heart after a ride to save trusted drivers — they'll appear first next time you book.",
  },
];

const AUTO_ADVANCE_MS = 3500;

export function OnboardingCarousel() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (paused) return;
    timerRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % SLIDES.length);
    }, AUTO_ADVANCE_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [paused]);

  function resumeAfterInteraction() {
    setPaused(true);
    window.setTimeout(() => setPaused(false), AUTO_ADVANCE_MS);
  }

  function goTo(i: number) {
    setIndex(i);
    resumeAfterInteraction();
  }

  function handleDragEnd(_: unknown, info: PanInfo) {
    const threshold = 50;
    if (info.offset.x < -threshold) {
      setIndex((i) => (i + 1) % SLIDES.length);
      resumeAfterInteraction();
    } else if (info.offset.x > threshold) {
      setIndex((i) => (i - 1 + SLIDES.length) % SLIDES.length);
      resumeAfterInteraction();
    }
  }

  const slide = SLIDES[index];
  const Icon = slide.icon;

  return (
    <div className="w-full">
      <p className="mb-3 text-center font-display text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground/60">
        How TripNest works
      </p>

      <div className="relative overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={index}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.6}
            onDragEnd={handleDragEnd}
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -60 }}
            transition={{ type: "spring", stiffness: 260, damping: 28 }}
            className="card flex min-h-[168px] cursor-grab flex-col items-center justify-center p-6 text-center active:cursor-grabbing"
          >
            <span className="mb-3.5 grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary-soft">
              <Icon className="h-6 w-6 text-accent" aria-hidden />
            </span>
            <h3 className="font-display text-base font-bold text-foreground">
              {slide.title}
            </h3>
            <p className="mt-1.5 max-w-[280px] text-[13px] leading-relaxed text-muted-foreground">
              {slide.description}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Dot indicators */}
      <div className="mt-4 flex items-center justify-center gap-1.5">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            aria-label={`Go to slide ${i + 1}`}
            className="p-1"
          >
            <span
              className={cn(
                "block h-1.5 rounded-full transition-all duration-300",
                i === index ? "w-6 bg-accent" : "w-1.5 bg-muted-foreground/30"
              )}
            />
          </button>
        ))}
      </div>
    </div>
  );
}