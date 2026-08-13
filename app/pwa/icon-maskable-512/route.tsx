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
        background: "linear-gradient(135deg, #0f172a 0%, #111a2e 100%)",
      }}
    >
      {/* Maskable artwork must be centered within the safe zone (80% of the
          canvas) so circular/rounded masks don't clip it. */}
      <div
        style={{
          display: "flex",
          width: 410,
          height: 410,
          backgroundImage: `url("data:image/svg+xml;base64,${Buffer.from(
            markSvg(48)
          ).toString("base64")}")`,
          backgroundSize: "410px 410px",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
        }}
      />
    </div>,
    { width: 512, height: 512, headers: { "Cache-Control": "public, max-age=31536000, immutable" } }
  );
}