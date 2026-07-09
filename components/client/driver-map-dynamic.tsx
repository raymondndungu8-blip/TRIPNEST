"use client";

import dynamic from "next/dynamic";

/** Client-only wrapper — MapLibre touches `window`, so it must not SSR. */
export const DriverMap = dynamic(
  () => import("./driver-map").then((m) => m.DriverMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 w-full animate-pulse rounded-2xl border border-border bg-surface" />
    ),
  }
);
