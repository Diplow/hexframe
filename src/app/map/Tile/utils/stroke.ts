import type { TileScale } from "~/app/map/Canvas/base/BaseTileLayout";

export type StrokeConfig = {
  color: "zinc-950" | "zinc-900" | "zinc-800" | "zinc-50" | "transparent";
  width: number;
};

export function getDefaultStroke(scale: TileScale, isExpanded = false, isShallow = false): StrokeConfig {
  // Apply 1px stroke for non-expanded tiles or shallow tiles
  if (!isExpanded || isShallow) {
    return { color: "zinc-950" as const, width: 1 };
  }
  
  // For expanded non-shallow tiles, keep transparent
  return { color: "transparent" as const, width: 0 };
}

export function getStrokeHexColor(color: StrokeConfig["color"]): string {
  switch (color) {
    case "zinc-950":
      return "var(--stroke-color-950)";
    case "zinc-900":
      return "var(--stroke-color-900)";
    case "zinc-800":
      return "var(--stroke-color-800)";
    case "zinc-50":
      return "var(--stroke-color-50)";
    default:
      return "transparent";
  }
}