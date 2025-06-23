import type { TileScale } from "~/app/static/map/Tile/Base/base";

export type StrokeConfig = {
  color: "zinc-950" | "zinc-900" | "zinc-800" | "zinc-50" | "transparent";
  width: number;
};

export function getDefaultStroke(scale: TileScale, isExpanded = false): StrokeConfig {
  if (isExpanded) {
    return { color: "transparent" as const, width: 0 };
  }
  
  return scale === 3 
    ? { color: "zinc-950" as const, width: 0.75 } 
    : scale === 2 
      ? { color: "zinc-900" as const, width: 0.5 } 
      : scale === 1 
        ? { color: "zinc-900" as const, width: 0.25 } 
        : { color: "transparent" as const, width: 0 };
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