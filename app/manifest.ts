import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TripNest — Better the driver you know.",
    short_name: "TripNest",
    description:
      "Pre-order drivers for scheduled rides, airport pickups, event travel, and shared rides.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0b1220",
    theme_color: "#0b1220",
    categories: ["travel", "navigation", "transportation"],
    icons: [
      {
        src: "/pwa/icon-192",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa/icon-512",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa/icon-maskable-512",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      { src: "/apple-icon", type: "image/png", sizes: "180x180" },
    ],
    shortcuts: [
      {
        name: "Book a ride",
        short_name: "Book",
        description: "Request a scheduled ride",
        url: "/client",
        icons: [{ src: "/pwa/icon-192", sizes: "192x192" }],
      },
      {
        name: "Driver mode",
        short_name: "Drive",
        description: "Go online and accept requests",
        url: "/driver",
        icons: [{ src: "/pwa/icon-192", sizes: "192x192" }],
      },
    ],
  };
}