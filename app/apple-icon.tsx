import { ImageResponse } from "next/og";
import { logoDataUri } from "@/lib/logo-data";

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
        <img
          src={logoDataUri()}
          width={124}
          height={131}
          style={{ objectFit: "contain" }}
          alt="TripNest"
        />
      </div>
    ),
    {
      ...size,
      headers: { "Cache-Control": "public, max-age=31536000, immutable" },
    }
  );
}
