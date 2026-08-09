/**
 * TripNest brand mark as a self-contained SVG string, for rasterization in
 * next/og image routes (favicon, app icon, OG image). Kept in sync with
 * components/brand/logo.tsx. No CSS filters here — resvg (used by next/og)
 * renders gradients + paths reliably, but not all filter primitives.
 */
export function markSvg(size = 48): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 48 48">
  <defs>
    <linearGradient id="tnBladeA" x1="0" y1="1" x2="1" y2="0">
      <stop offset="0" stop-color="#1D4ED8"/>
      <stop offset="0.55" stop-color="#2563EB"/>
      <stop offset="1" stop-color="#3B82F6"/>
    </linearGradient>
    <linearGradient id="tnBladeB" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#7DD3FC"/>
      <stop offset="0.5" stop-color="#38BDF8"/>
      <stop offset="1" stop-color="#22D3EE"/>
    </linearGradient>
  </defs>
  <path d="M9 47 C 13 31 21 18 35 7 C 30 25 25 35 21 47 C 17 48 12 48 9 47 Z" fill="url(#tnBladeA)"/>
  <path d="M39 47 C 35 31 27 18 13 7 C 18 25 23 35 27 47 C 31 48 36 48 39 47 Z" fill="url(#tnBladeB)"/>
  <path d="M24 20 C 26.5 22.5 26.5 25.5 24 28 C 21.5 25.5 21.5 22.5 24 20 Z" fill="#E0F2FE" opacity="0.85"/>
</svg>`;
}

export function markDataUri(size = 48): string {
  return `data:image/svg+xml;base64,${Buffer.from(markSvg(size)).toString("base64")}`;
}

/**
 * Modern car illustration as a self-contained SVG string, used in the OG
 * thumbnail. Rendered with the same navy + electric-blue palette as the
 * rest of the brand. resvg (next/og) renders paths + gradients reliably.
 */
export function carSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="140" viewBox="0 0 320 140">
  <defs>
    <linearGradient id="tnCarBody" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#3B82F6"/>
      <stop offset="1" stop-color="#0EA5E9"/>
    </linearGradient>
    <linearGradient id="tnCarGlass" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#38BDF8" stop-opacity="0.5"/>
      <stop offset="1" stop-color="#0B1220" stop-opacity="0.85"/>
    </linearGradient>
    <linearGradient id="tnHub" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#7DD3FC"/>
      <stop offset="1" stop-color="#0891B2"/>
    </linearGradient>
  </defs>

  <line x1="8" y1="48" x2="52" y2="48" stroke="#38BDF8" stroke-opacity="0.5" stroke-width="5" stroke-linecap="round"/>
  <line x1="0" y1="70" x2="40" y2="70" stroke="#7DD3FC" stroke-opacity="0.25" stroke-width="5" stroke-linecap="round"/>

  <path d="M300,100 C302,92 299,85 292,81 C288,77 283,75 276,75 C262,73 250,69 244,61 C238,49 226,43 212,41 C198,39 184,39 170,41 C156,43 148,49 144,57 C140,63 132,65 122,67 C108,69 96,73 90,79 C86,83 84,89 86,95 L90,103 L120,103 A22,22 0 0 0 160,103 L198,103 A22,22 0 0 0 238,103 L292,103 Z" fill="url(#tnCarBody)"/>
  <path d="M110,58 C116,48 128,43 140,42 L158,41 L162,58 C148,56 128,56 110,58 Z" fill="url(#tnCarGlass)"/>
  <line x1="148" y1="42" x2="148" y2="101" stroke="#0B1220" stroke-opacity="0.25" stroke-width="2"/>
  <path d="M96,84 L104,74 L108,74 L108,84 Z" fill="#38BDF8" fill-opacity="0.85"/>
  <rect x="234" y="72" width="20" height="12" rx="2" fill="#38BDF8" fill-opacity="0.85"/>

  <circle cx="140" cy="103" r="21" fill="#0A1420"/>
  <circle cx="140" cy="103" r="15" fill="none" stroke="#38BDF8" stroke-opacity="0.5" stroke-width="2"/>
  <circle cx="140" cy="103" r="9" fill="url(#tnHub)"/>
  <circle cx="218" cy="103" r="21" fill="#0A1420"/>
  <circle cx="218" cy="103" r="15" fill="none" stroke="#38BDF8" stroke-opacity="0.5" stroke-width="2"/>
  <circle cx="218" cy="103" r="9" fill="url(#tnHub)"/>

  <line x1="0" y1="126" x2="320" y2="126" stroke="#38BDF8" stroke-opacity="0.2" stroke-width="3" stroke-linecap="round"/>
  <line x1="16" y1="116" x2="52" y2="116" stroke="#7DD3FC" stroke-opacity="0.5" stroke-width="2" stroke-linecap="round"/>
</svg>`;
}

export function carDataUri(): string {
  return `data:image/svg+xml;base64,${Buffer.from(carSvg()).toString("base64")}`;
}

export const BRAND = {
  name: "TripNest",
  motto: "better the driver.",
  navy: "#0b1220",
  surface: "#111a2e",
  accent: "#38bdf8",
};
