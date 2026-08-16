import { readFileSync } from "node:fs";
import path from "node:path";

let cachedLogoDataUri: string | null = null;

/** Return the supplied TripNest logo as a data URI for Next image generation. */
export function logoDataUri(): string {
  if (!cachedLogoDataUri) {
    const file = readFileSync(
      path.join(process.cwd(), "public", "images", "tripnest-logo.png")
    );
    cachedLogoDataUri = `data:image/png;base64,${file.toString("base64")}`;
  }
  return cachedLogoDataUri;
}
