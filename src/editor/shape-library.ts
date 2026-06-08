import type { ShapeLibraryItem } from "./tool-definitions";

export type { ShapeLibraryGroup, ShapeLibraryItem } from "./tool-definitions";

export const SHAPE_DROP_MIME = "application/x-leafer-flow-shape";

export function getShapeLibrarySearchText(item: ShapeLibraryItem) {
  return [item.label, item.tool, ...item.keywords].join(" ").toLowerCase();
}
