import { Group, type IUI } from "leafer";

/**
 * Groups should behave as atomic canvas objects: users can select and transform
 * the group itself, but direct canvas hit/edit operations must not enter its
 * children. The layer tree may still show the children for structure.
 */
export function makeGroupSelectionAtomic(group: Group) {
  group.editable = true;
  disableDescendantSelection(group.children as IUI[] | undefined);
}

export function normalizeAtomicGroups(nodes: IUI[] | undefined) {
  nodes?.forEach((node) => {
    if (node instanceof Group) {
      makeGroupSelectionAtomic(node);
      return;
    }

    normalizeAtomicGroups((node as unknown as { children?: IUI[] }).children);
  });
}

export function restoreSelectionForUngroupedNodes(nodes: IUI[]) {
  nodes.forEach((node) => {
    node.editable = true;
    if (node instanceof Group) {
      makeGroupSelectionAtomic(node);
    }
  });
}

function disableDescendantSelection(children: IUI[] | undefined) {
  children?.forEach((child) => {
    child.editable = false;
    disableDescendantSelection((child as unknown as { children?: IUI[] }).children);
  });
}
