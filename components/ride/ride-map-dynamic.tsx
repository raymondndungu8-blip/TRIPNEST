"use client";

import dynamic from "next/dynamic";

/** Client-only wrapper — MapLibre touches `window`, so it must not SSR. */
export const RideMap = dynamic(
  () => import("./ride-map").then((m) => m.RideMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-56 w-full animate-pulse rounded-2xl border border-border bg-surface" />
    ),
  }
);
