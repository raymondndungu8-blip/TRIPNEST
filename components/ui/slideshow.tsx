"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

export const slides = [
  {
    img: "/images/tripnest-hero.jpg",
    title: "Better the driver",
    accent: "you know.",
    description: "Pre-book a dependable ride for the moments that matter.",
  },
  {
    img: "/images/tripnest-event-nairobi.jpg",
    title: "Make the night",
    accent: "yours.",
    description: "Arrive ready for the moments worth remembering.",
  },
  {
    img: "/images/tripnest-airport.jpg",
    title: "On time,",
    accent: "every time.",
    description: "Airport transfers planned around your schedule.",
  },
  {
    img: "/images/event-nairobi-run.jpg",
    title: "A better way",
    accent: "to move.",
    description: "Reliable transport for the city’s biggest days.",
  },
  {
    img: "/images/event-diani-beach.jpg",
    title: "Take the scenic",
    accent: "route.",
    description: "Weekend plans deserve a smoother journey.",
  },
] as const;

export type TripNestSlide = (typeof slides)[number];

export function Slideshow({
  onSlideChange,
}: {
  onSlideChange?: (slide: TripNestSlide) => void;
}) {
  const [current, setCurrent] = useState(0);

  const nextSlide = useCallback(() => {
    setCurrent((prev) => (prev + 1) % slides.length);
  }, []);

  const prevSlide = useCallback(() => {
    setCurrent((prev) => (prev - 1 + slides.length) % slides.length);
  }, []);

  useEffect(() => {
    onSlideChange?.(slides[current]);
  }, [current, onSlideChange]);

  useEffect(() => {
    const timer = window.setInterval(nextSlide, 6000);
    return () => clearInterval(timer);
  }, [nextSlide]);

  return (
    <div className="slideshow">
      {slides.map((slide, i) => (
        <div
          key={slide.img}
          className={`slide ${i === current ? "active" : ""}`}
          style={{ backgroundImage: `url(${slide.img})` }}
          aria-hidden={i !== current}
        >
          <div className="slide-text" aria-hidden="true">
            <span>{slide.title}</span>
            <span>{slide.accent}</span>
          </div>
        </div>
      ))}

      <button className="nav left" onClick={prevSlide} aria-label="Previous slide">
        <ArrowLeft className="h-5 w-5" aria-hidden />
      </button>
      <button className="nav right" onClick={nextSlide} aria-label="Next slide">
        <ArrowRight className="h-5 w-5" aria-hidden />
      </button>

      <div className="pagination-dots" role="tablist" aria-label="TripNest intro slides">
        {slides.map((slide, i) => (
          <button
            key={slide.img}
            type="button"
            role="tab"
            aria-selected={i === current}
            aria-label={`Show slide ${i + 1}`}
            className={`pagination-dot ${i === current ? "active" : ""}`}
            onClick={() => setCurrent(i)}
          />
        ))}
      </div>
    </div>
  );
}

export default Slideshow;
