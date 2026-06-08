import { toolDefinitions } from "../../tool-definitions";

export function listToolLabelsByLibraryGroup(groupId: string) {
  return toolDefinitions
    .filter((definition) => definition.library?.groupId === groupId)
    .map((definition) => definition.label);
}

export function listBasicToolLabels() {
  return toolDefinitions
    .filter((definition) => definition.library?.groupId === "basic" || !definition.library)
    .map((definition) => definition.label);
}
