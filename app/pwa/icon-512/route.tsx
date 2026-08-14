import { ImageResponse } from "next/og";
import { markSvg } from "@/lib/brand-svg";

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
      <div
        style={{
          display: "flex",
          width: 184,
          height: 184,
          backgroundImage: `url("data:image/svg+xml;base64,${Buffer.from(
            markSvg(48)
          ).toString("base64")}")`,
          backgroundSize: "184px 184px",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
        }}
      />
    </div>,
    { width: 512, height: 512 }
  );
}