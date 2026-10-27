import type Editor from "../editor";
import type { DocumentEdge, JsonObject } from "../document/model";
import type { ElementStatePatch, LayerOrderAction, ElementPlacement, AlignAction } from "../document/element-operations";
import type { PresentationPatch } from "../document/commands";

export function registerDocumentCommands(editor: Editor) {
  editor.commands.register<{ edgeId: string }>({
    id: "document.connector.label.add",
    label: "Add connector label",
    run: (_editor, payload) => {
      if (!payload) throw new Error("Connector id is required");
      editor.documentCommands.addConnectorLabel(payload.edgeId);
      return { success: true, message: "Connector label added" };
    },
  });
  editor.commands.register<{ edgeId: string; point: { x: number; y: number } }>({
    id: "document.connector.waypoint.add",
    label: "Add connector waypoint",
    run: (_editor, payload) => {
      if (!payload) throw new Error("Waypoint payload is required");
      editor.documentCommands.addConnectorWaypoint(payload.edgeId, payload.point);
      return { success: true, message: "Connector waypoint added" };
    },
  });
  editor.commands.register<{ edgeId: string }>({
    id: "document.connector.waypoints.remove",
    label: "Remove connector waypoints",
    run: (_editor, payload) => {
      if (!payload) throw new Error("Connector id is required");
      const count = editor.documentCommands.removeConnectorWaypoints(payload.edgeId);
      return { success: count > 0, message: `Removed ${count} waypoints` };
    },
  });
  editor.commands.register<{ ids: string[]; action: AlignAction }>({
    id: "document.elements.align",
    label: "Align document elements",
    run: (_editor, payload) => {
      if (!payload) throw new Error("Alignment payload is required");
      const count = editor.documentCommands.alignElements(payload.ids, payload.action);
      return { success: count > 0, message: `Aligned ${count} elements` };
    },
  });
  editor.commands.register<{ ids: string[]; patch: PresentationPatch }>({
    id: "document.presentation.update",
    label: "Update document presentation",
    run: (_editor, payload) => {
      if (!payload) throw new Error("Presentation payload is required");
      const count = editor.documentCommands.updatePresentation(payload.ids, payload.patch);
      return { success: count > 0, message: `Updated ${count} elements` };
    },
  });
  editor.commands.register<{ patches: Record<string, PresentationPatch> }>({
    id: "document.presentations.update",
    label: "Update document presentations",
    run: (_editor, payload) => {
      if (!payload) throw new Error("Presentation patches are required");
      const count = editor.documentCommands.updatePresentations(payload.patches);
      return { success: count > 0, message: `Updated ${count} presentations` };
    },
  });
  editor.commands.register<{ ids: string[] }>({
    id: "document.elements.group",
    label: "Group document elements",
    run: (_editor, payload) => {
      if (!payload) throw new Error("Group selection is required");
      const result = editor.documentCommands.groupElements(payload.ids);
      return { success: true, message: `Grouped ${result.count} elements` };
    },
  });
  editor.commands.register<{ ids: string[] }>({
    id: "document.elements.ungroup",
    label: "Ungroup document elements",
    run: (_editor, payload) => {
      if (!payload) throw new Error("Group selection is required");
      const result = editor.documentCommands.ungroupElements(payload.ids);
      return { success: true, message: `Ungrouped ${result.count} elements` };
    },
  });
  editor.commands.register<{ ids: string[] }>({
    id: "document.clipboard.copy",
    label: "Copy document elements",
    run: (_editor, payload) => {
      if (!payload) throw new Error("Clipboard selection is required");
      const count = editor.documentCommands.copyElements(payload.ids);
      return { success: true, message: `Copied ${count} elements` };
    },
  });
  editor.commands.register<{ ids: string[] }>({
    id: "document.clipboard.cut",
    label: "Cut document elements",
    run: (_editor, payload) => {
      if (!payload) throw new Error("Clipboard selection is required");
      const count = editor.documentCommands.cutElements(payload.ids);
      return { success: true, message: `Cut ${count} elements` };
    },
  });
  editor.commands.register({
    id: "document.clipboard.paste",
    label: "Paste document elements",
    run: () => {
      const ids = editor.documentCommands.pasteElements();
      return { success: ids.length > 0, message: `Pasted ${ids.length} elements` };
    },
  });
  editor.commands.register<{ ids: string[] }>({
    id: "document.clipboard.duplicate",
    label: "Duplicate document elements",
    run: (_editor, payload) => {
      if (!payload) throw new Error("Clipboard selection is required");
      const ids = editor.documentCommands.duplicateElements(payload.ids);
      return { success: ids.length > 0, message: `Duplicated ${ids.length} elements` };
    },
  });
  editor.commands.register<{ id: string; targetId: string; placement: ElementPlacement }>({
    id: "document.elements.place",
    label: "Place document element",
    run: (_editor, payload) => {
      if (!payload) throw new Error("Placement payload is required");
      editor.documentCommands.placeElement(payload.id, payload.targetId, payload.placement);
      return { success: true, message: "Element placed" };
    },
  });
  editor.commands.register<{ ids: string[]; dx: number; dy: number }>({
    id: "document.elements.move",
    label: "Move document elements",
    run: (_editor, payload) => {
      if (!payload) throw new Error("Movement payload is required");
      const count = editor.documentCommands.moveElements(payload.ids, payload.dx, payload.dy);
      return { success: count > 0, message: `Moved ${count} elements` };
    },
  });
  editor.commands.register<{ ids: string[]; patch: ElementStatePatch }>({
    id: "document.elements.state",
    label: "Set document element state",
    run: (_editor, payload) => {
      if (!payload) throw new Error("State payload is required");
      const count = editor.documentCommands.setElementState(payload.ids, payload.patch);
      return { success: true, message: `Updated ${count} elements` };
    },
  });
  editor.commands.register<{ ids: string[]; action: LayerOrderAction }>({
    id: "document.elements.reorder",
    label: "Reorder document elements",
    run: (_editor, payload) => {
      if (!payload) throw new Error("Layer order payload is required");
      const count = editor.documentCommands.reorderElements(payload.ids, payload.action);
      return { success: count > 0, message: `Reordered ${count} elements` };
    },
  });
  editor.commands.register({
    id: "document.resources.prune",
    label: "Remove unused document resources",
    run: () => {
      const count = editor.resources.pruneUnused();
      return { success: true, message: `Removed ${count} unused resources` };
    },
  });
  editor.commands.register<{ type: string; data: JsonObject; parentId?: string }>({
    id: "document.node.create",
    label: "Create document node",
    run: (_editor, payload) => {
      if (!payload) throw new Error("Node payload is required");
      editor.documentCommands.createNode(payload.type, payload.data, payload.parentId);
      return { success: true, message: "Node created" };
    },
  });
  editor.commands.register<{ id: string; patch: JsonObject }>({
    id: "document.node.update",
    label: "Update document node",
    run: (_editor, payload) => {
      if (!payload) throw new Error("Node payload is required");
      editor.documentCommands.updateNode(payload.id, payload.patch);
      return { success: true, message: "Node updated" };
    },
  });
  editor.commands.register<{ patches: Record<string, JsonObject> }>({
    id: "document.nodes.update",
    label: "Update document nodes",
    run: (_editor, payload) => {
      if (!payload) throw new Error("Node patches are required");
      const count = editor.documentCommands.updateNodes(payload.patches);
      return { success: true, message: `Updated ${count} nodes` };
    },
  });
  editor.commands.register<DocumentEdge>({
    id: "document.edge.create",
    label: "Create document edge",
    run: (_editor, payload) => {
      if (!payload) throw new Error("Edge payload is required");
      editor.documentCommands.insertEdge(payload);
      return { success: true, message: "Edge created" };
    },
  });
  editor.commands.register<{ ids: string[] }>({
    id: "document.elements.delete",
    label: "Delete document elements",
    run: (_editor, payload) => {
      if (!payload) throw new Error("Element ids are required");
      const count = editor.documentCommands.remove(payload.ids);
      return { success: true, message: `Deleted ${count} elements` };
    },
  });
  editor.commands.register({
    id: "document.clear",
    label: "Clear document",
    run: () => {
      editor.documentCommands.clear();
      return { success: true, message: "Document cleared" };
    },
  });
  editor.commands.register<JsonObject>({
    id: "document.settings.update",
    label: "Update document settings",
    run: (_editor, payload) => {
      if (!payload) throw new Error("Settings payload is required");
      editor.documentCommands.updateSettings(payload);
      return { success: true, message: "Settings updated" };
    },
  });
}
