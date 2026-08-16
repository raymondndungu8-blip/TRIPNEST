import { ImageResponse } from "next/og";
import { logoDataUri } from "@/lib/logo-data";

export const runtime = "nodejs";
export const dynamic = "force-static";

export function GET() {
  return new ImageResponse(
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
      {/* Keep the artwork inside the maskable safe zone. */}
      <img
        src={logoDataUri()}
        width={280}
        height={296}
        style={{ objectFit: "contain" }}
        alt="TripNest"
      />
    </div>,
    {
      width: 512,
      height: 512,
      headers: { "Cache-Control": "public, max-age=31536000, immutable" },
    }
  );
}
