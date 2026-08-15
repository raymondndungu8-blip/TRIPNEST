import { ImageResponse } from "next/og";
import { markDataUri } from "@/lib/brand-svg";

export const runtime = "nodejs";
export const dynamic = "force-static";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0b1220",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={markDataUri(92)} width={92} height={92} alt="TripNest" />
      </div>
    ),
    { ...size, headers: { "Cache-Control": "public, max-age=31536000, immutable" } }
  );
}
