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
      }}
    >
      <img
        src={logoDataUri()}
        width={132}
        height={140}
        style={{ objectFit: "contain" }}
        alt="TripNest"
      />
    </div>,
    {
      width: 192,
      height: 192,
      headers: { "Cache-Control": "public, max-age=300" },
    }
  );
}
