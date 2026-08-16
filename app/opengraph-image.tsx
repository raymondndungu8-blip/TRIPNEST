import { ImageResponse } from "next/og";
import { carDataUri, BRAND } from "@/lib/brand-svg";
import { logoDataUri } from "@/lib/logo-data";

export const runtime = "nodejs";
export const alt = "TripNest — Better the driver you know.";
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
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingLeft: 80,
          paddingRight: 72,
          background:
            "radial-gradient(1100px 560px at 78% 8%, rgba(37,99,235,0.4), transparent 62%), radial-gradient(700px 500px at -6% 108%, rgba(56,189,248,0.22), transparent 55%), linear-gradient(135deg, #0b1220 0%, #111a2e 100%)",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoDataUri()}
            width={104}
            height={110}
            style={{ objectFit: "contain" }}
            alt="TripNest"
          />
          <div
            style={{
              display: "flex",
              marginTop: 24,
              fontFamily: "Sora",
              fontSize: 78,
              fontWeight: 700,
              letterSpacing: 9,
              color: "#ffffff",
            }}
          >
            TRIPNEST
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 10,
              fontFamily: "Inter",
              fontSize: 38,
              fontWeight: 500,
              color: "#38bdf8",
            }}
          >
            {BRAND.motto}
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 18,
              fontFamily: "Inter",
              fontSize: 24,
              color: "#94a3b8",
            }}
          >
            Ride &amp; event transport · pre-order your driver
          </div>
        </div>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={carDataUri()} width={520} height={228} alt="" />
      </div>
    ),
    { ...size, fonts }
  );
}
