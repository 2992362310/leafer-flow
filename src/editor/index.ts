import Editor from "./editor";
import { builtinPlugins } from "./builtin/plugins";
import { getEnabledPluginIds } from "./plugins/market/builtin-registry";
import { getZoomPercent } from "./action/do-view";

export function initEditor(view: HTMLElement) {
  const editor = new Editor({
    view,
    editor: {
      // 拖动元素时隐藏编辑框（紫色边框矩形），避免视觉干扰
      hideOnMove: true,
    },
    tree: { type: "design" },
  });

  // hideOnMove 仅覆盖移动操作；缩放/旋转/倾斜时编辑框矩形仍会显示。
  // 这里直接 patch EditBox.onTransformStart，让所有变换期间都隐藏编辑框。
  patchEditBoxForTransform(editor);

  activateEnabledPlugins(editor);

  return editor;
}

/**
 * Leafer 编辑器内置的 EditBox.onTransformStart 只在 moving/gesturing 时根据
 * hideOnMove 隐藏编辑框（EditBox.ts: `if (this.moving || this.gesturing)`），
 * 缩放/旋转/倾斜时编辑框矩形（紫色 #836DFF 边框）仍然可见，造成视觉干扰。
 *
 * 这里直接 patch EditBox.onTransformStart，在所有变换操作开始时把整个 editBox
 * 置为不可见（包括边框矩形和控制点），变换结束后由 editor.update() 重新计算可见性，
 * 从而保证移动、缩放、旋转、倾斜全程都不显示矩形。
 */
function patchEditBoxForTransform(editor: Editor) {
  editor.app.on("ready", () => {
    const editorPlugin = editor.app.editor;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const editBox = editorPlugin?.editBox as any;
    if (!editBox) return;

    const originalOnTransformStart = editBox.onTransformStart?.bind(editBox);
    if (typeof originalOnTransformStart !== "function") return;

    editBox.onTransformStart = (e: unknown) => {
      // 调用原始逻辑（记录 dragStartData、处理 hideOnMove 等）
      originalOnTransformStart(e);
      // 变换进行中隐藏整个编辑框（包括边框矩形和控制点）
      editBox.visible = false;
    };
  });
}

function activateEnabledPlugins(editor: Editor) {
  const enabledIds = new Set(getEnabledPluginIds());
  builtinPlugins.forEach((plugin) => {
    if (plugin.manifest.required || enabledIds.has(plugin.manifest.id)) {
      void editor.pluginManager.activate(plugin);
    }
  });
}

export { Editor, getZoomPercent };
