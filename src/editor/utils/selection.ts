import type { IUI } from "leafer";

export function collectSelectableItems(items: IUI[]): IUI[] {
  const result: IUI[] = [];

  for (const item of items) {
    if (item.tag === "Connector") continue;
    result.push(item);
  }

  return result;
}
