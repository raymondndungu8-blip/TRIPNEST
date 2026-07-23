"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

const slides = [
  {
    img: "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=1920&q=80",
    text: ["PRE-BOOK", "EXCLUSIVE RIDES"],
  },
  {
    img: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=1920&q=80",
    text: ["TRANSIT TO", "YOUR NEXT EVENT"],
  },
  {
    img: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=1920&q=80",
    text: ["TIMED AIRPORT", "TRANSFERS"],
  },
  {
    img: "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&w=1920&q=80",
    text: ["TRUSTED", "PROFESSIONAL DRIVERS"],
  },
  {
    img: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1920&q=80",
    text: ["THE RIDE YOU KNOW,", "THE SERVICE YOU TRUST"],
  },
];

export function Slideshow() {
  const [current, setCurrent] = useState(0);

  const nextSlide = useCallback(() => {
    setCurrent((prev) => (prev + 1) % slides.length);
  }, []);

  const prevSlide = useCallback(() => {
    setCurrent((prev) => (prev - 1 + slides.length) % slides.length);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(nextSlide, 6000);
    return () => clearInterval(timer);
  }, [nextSlide]);

  return (
    <div className="slideshow">
      {slides.map((slide, i) => (
        <div
          key={i}
          className={`slide ${i === current ? "active" : ""}`}
          style={{ backgroundImage: `url(${slide.img})` }}
          aria-hidden={i !== current}
        >
          <div className="slide-text">
            {slide.text.map((t, j) => (
              <span key={j}>{t}</span>
            ))}
          </div>
        </div>
      ))}

      <button className="nav left" onClick={prevSlide} aria-label="Previous slide">
        <ArrowLeft className="h-5 w-5" aria-hidden />
      </button>
      <button className="nav right" onClick={nextSlide} aria-label="Next slide">
        <ArrowRight className="h-5 w-5" aria-hidden />
      </button>

      <div className="counter">
        {String(current + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}
      </div>
    </div>
  );
}

export default Slideshow;
