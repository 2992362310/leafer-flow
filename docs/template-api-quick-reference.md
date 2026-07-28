## 模板系统 API 快速参考

### TemplateRegistry (templates/registry.ts)

**用途**: 读取模板信息，无需实例化

```typescript
import { TemplateRegistry } from "../templates/registry";

// 获取所有可用模板
const kinds = TemplateRegistry.getAvailableKinds();
// → ["approval", "decision", "workOrder", "crm", ...]

// 获取模板定义
const template = TemplateRegistry.getTemplate("approval");
// → { graph: { nodes: [...], edges: [...] }, settings: {...}, message: "..." }

// 获取节点样式
const style = TemplateRegistry.getNodeStyle("flow_input");
// → { fill: { color: ... }, ... }

// 验证模板类型
if (TemplateRegistry.isValidKind(userInput)) {
  // 安全使用
}

// 获取显示名称
const name = TemplateRegistry.getTemplateName("approval");
// → "审批流程"
```

---

### TemplateManager (templates/index.ts)

**用途**: 执行模板插入操作，需要从编辑器获取

```typescript
// 方式 1: 在插件中通过编辑器上下文获取
// (需要在 manifest 中声明: dependencies: ["leafer-flow.templates"])

const manager = (editor as any).__templateManager__;
if (!manager) {
  throw new Error("TemplateManager 未初始化");
}

// 执行插入
const result = await manager.insertTemplate("approval", {
  offsetX: 150, // 可选，默认 100
  offsetY: 100, // 可选，默认 80
  scale: 0.9, // 可选，默认 1（范围 0.5-2）
});

if (result.success) {
  console.log(result.message); // "审批流程（缩放 90%）"
} else {
  console.error(result.message); // 错误消息
}
```

---

### 导出兼容性 (templates/registry.ts)

**用途**: 向后兼容性，现有代码无需修改

```typescript
// 可以继续从 registry.ts 导入（新增）
import { templateMap, getTemplateStyle } from "../templates/registry";

// 或者保持从 defs.ts 导入（原始方式）
import { templateMap, getTemplateStyle } from "../../templates/defs";

// 两种方式都有效
```

---

## 常见使用场景

### 场景 1: 在插件中添加模板命令

```typescript
import { TemplateRegistry } from "../templates/registry";

export const myTemplatePlugin: EditorPluginModule = {
  manifest: {
    id: "leafer-flow.my-template-plugin",
    dependencies: ["leafer-flow.templates"], // ← 关键
  },

  activate(ctx) {
    ctx.editor.commands.register({
      id: "insertMyTemplate",
      label: "插入自定义模板",
      run: async (editor) => {
        const manager = (editor as any).__templateManager__;
        const result = await manager.insertTemplate("approval");
        return result;
      },
    });
  },
};
```

### 场景 2: Agent 工具中使用模板

```typescript
import { templateMap } from "../../../templates/defs"; // ✓ 无需改动

// 在 insert_template 工具中
const data = templateMap[kind as never](); // ✓ 继续工作

// 或者使用新的 TemplateRegistry
import { TemplateRegistry } from "../../../templates/registry";
if (TemplateRegistry.isValidKind(kind)) {
  const data = TemplateRegistry.getTemplate(kind);
}
```

### 场景 3: 检查模板可用性

```typescript
import { TemplateRegistry } from "../templates/registry";

function canInsertTemplate(kind: unknown): boolean {
  return TemplateRegistry.isValidKind(kind);
}

// 获取可用列表用于 UI
function getTemplateOptions() {
  return TemplateRegistry.getAvailableKinds().map((kind) => ({
    value: kind,
    label: TemplateRegistry.getTemplateName(kind),
  }));
}
```

### 场景 4: 支持模板定制（位置和缩放）

```typescript
const manager = (editor as any).__templateManager__;

// 左对齐，小尺寸
await manager.insertTemplate("approval", {
  offsetX: 50,
  offsetY: 50,
  scale: 0.7,
});

// 右对齐，大尺寸
await manager.insertTemplate("workOrder", {
  offsetX: 500,
  offsetY: 50,
  scale: 1.3,
});

// 默认位置和尺寸
await manager.insertTemplate("decision");
```

---

## 类型定义速查表

```typescript
// 导入
import { TemplateRegistry } from "../templates/registry";
import type { TemplateKind } from "../templates/registry";

// 方法签名
TemplateRegistry.getAvailableKinds(): TemplateKind[]
TemplateRegistry.getTemplate(kind: TemplateKind): TemplateDefinition | null
TemplateRegistry.getNodeStyle(kind: TemplateKind): Record<string, any>
TemplateRegistry.isValidKind(kind: unknown): kind is TemplateKind
TemplateRegistry.getTemplateName(kind: TemplateKind): string

// TemplateManager 方法
manager.insertTemplate(
  kind: TemplateKind,
  options?: {
    offsetX?: number;    // 默认 100
    offsetY?: number;    // 默认 80
    scale?: number;      // 默认 1，范围 0.5-2
  }
): Promise<{
  success: boolean;
  message: string;
}>
```

---

## 常见错误及解决方案

| 错误                       | 原因                 | 解决                                                         |
| -------------------------- | -------------------- | ------------------------------------------------------------ |
| "TemplateManager 未初始化" | 插件未声明依赖       | 在 manifest 中添加 `dependencies: ["leafer-flow.templates"]` |
| "不支持的模板类型"         | 使用了无效的模板类型 | 使用 `TemplateRegistry.isValidKind()` 验证                   |
| "模板插入失败"             | 编辑器状态异常       | 检查编辑器是否已初始化，查看返回的错误消息                   |
| "导入找不到 registry.ts"   | 路径错误             | 使用 `../templates/registry` （相对于导入文件位置）          |

---

## 版本兼容性

| 特性             | v1.1 (旧) | v1.2 (新) | 注意                    |
| ---------------- | --------- | --------- | ----------------------- |
| templateMap      | ✓         | ✓         | 继续可用                |
| getTemplateStyle | ✓         | ✓         | 继续可用                |
| TemplateRegistry | ✗         | ✓         | 新增                    |
| TemplateManager  | ✗         | ✓         | 新增，推荐使用          |
| doInsertTemplate | ✓         | ✓         | 保持向后兼容            |
| 位置/缩放参数    | ✗         | ✓         | 仅 TemplateManager 支持 |

---

## 参考文档

- **完整指南**: `docs/template-system-guide.md`
- **API 源码**: `src/editor/builtin/templates/index.ts`
- **Registry 源码**: `src/editor/builtin/templates/registry.ts`
- **模板定义**: `src/editor/templates/defs.ts`
