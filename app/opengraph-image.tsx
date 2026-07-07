import { ImageResponse } from "next/og";
import { markDataUri, BRAND } from "@/lib/brand-svg";

export const runtime = "nodejs";
export const alt = "TripNest — better the driver you know.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

async function loadFonts() {
  const [sora, inter] = await Promise.all([
    fetch(
      "https://cdn.jsdelivr.net/npm/@fontsource/sora@5/files/sora-latin-700-normal.woff"
    ).then((r) => r.arrayBuffer()),
    fetch(
      "https://cdn.jsdelivr.net/npm/@fontsource/inter@5/files/inter-latin-500-normal.woff"
    ).then((r) => r.arrayBuffer()),
  ]);
  return [
    { name: "Sora", data: sora, weight: 700 as const, style: "normal" as const },
    { name: "Inter", data: inter, weight: 500 as const, style: "normal" as const },
  ];
}

export default async function OgImage() {
  const fonts = await loadFonts();
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(1200px 600px at 50% -10%, rgba(37,99,235,0.35), transparent 60%), linear-gradient(135deg, #0b1220 0%, #111a2e 100%)",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={markDataUri(160)} width={160} height={160} alt="" />
        <div
          style={{
            display: "flex",
            marginTop: 28,
            fontFamily: "Sora",
            fontSize: 104,
            fontWeight: 700,
            letterSpacing: 8,
            color: "#ffffff",
          }}
        >
          TRIPNEST
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 8,
            fontFamily: "Inter",
            fontSize: 40,
            fontWeight: 500,
            color: "#38bdf8",
          }}
        >
          {BRAND.motto}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 40,
            fontFamily: "Inter",
            fontSize: 26,
            color: "#94a3b8",
          }}
        >
          Ride &amp; event transport · pre-order your driver
        </div>
      </div>
    ),
    { ...size, fonts }
  );
}
