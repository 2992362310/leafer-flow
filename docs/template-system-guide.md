## 模板系统架构指南 (Template System Architecture Guide)

### 概述 (Overview)

Leafer Flow 的模板系统已从紧耦合的 `templates/defs.ts` + `do-template.ts` 重构为基于插件架构的独立系统。

**核心变化**:

- ✅ 将模板管理逻辑集中到 `src/editor/builtin/templates/` 独立插件
- ✅ 通过 `TemplateManager` 服务提供统一 API
- ✅ `template-actions` 插件依赖 `templates` 插件
- ✅ Agent 工具继续兼容，支持未来升级

---

### 架构层次 (Architecture Layers)

```
┌─────────────────────────────────────────────────────────┐
│ UI & Commands                                            │
│ - TemplateMarketDrawer (component)                       │
│ - template-actions 插件 (commands)                      │
└─────────────────────────────────────────────────────────┘
                          ↓ 依赖
┌─────────────────────────────────────────────────────────┐
│ Service Layer                                            │
│ - TemplateManager (in templates/index.ts)               │
│ - TemplateRegistry (in templates/registry.ts)           │
│ - 暴露给其他插件通过 editor.__templateManager__         │
└─────────────────────────────────────────────────────────┘
                          ↓ 使用
┌─────────────────────────────────────────────────────────┐
│ Core Definitions                                         │
│ - templates/defs.ts (9 template definitions)            │
│ - templates/insert.ts (graph insertion logic)           │
│ - templates/build.ts (deprecated)                       │
└─────────────────────────────────────────────────────────┘
```

---

### 关键组件 (Key Components)

#### 1. TemplateRegistry (templates/registry.ts)

**职责**: 静态工具类，提供模板访问的统一接口

```typescript
class TemplateRegistry {
  static getAvailableKinds(): TemplateKind[]; // 获取所有模板类型
  static getTemplate(kind): TemplateDefinition | null; // 获取模板定义
  static getNodeStyle(kind); // 获取节点样式
  static isValidKind(kind): boolean; // 验证模板类型
  static getTemplateName(kind): string; // 获取显示名称
}
```

**特点**:

- 所有方法都是静态的，无需实例化
- 充当 `templates/defs.ts` 的访问层
- 支持未来扩展（如果需要异步加载、缓存等）

#### 2. TemplateManager (templates/index.ts)

**职责**: 实例服务类，处理模板的完整插入流程

```typescript
class TemplateManager {
  constructor(editor: Editor) {}

  async insertTemplate(
    kind: TemplateKind,
    options?: {
      offsetX?: number; // 水平偏移 (default: 100)
      offsetY?: number; // 垂直偏移 (default: 80)
      scale?: number; // 缩放因子 (default: 1)
    },
  ): Promise<{ success: boolean; message: string }>;
}
```

**特点**:

- 管理完整的插入生命周期：事务 → 变换 → 插入 → 设置 → 保存
- 支持位置和缩放参数
- 返回成功/失败状态和消息
- 处理错误和异常情况

#### 3. templatesPlugin (templates/index.ts)

**职责**: 插件模块，集成 TemplateManager 服务

```typescript
export const templatesPlugin: EditorPluginModule = {
  manifest: {
    id: "leafer-flow.templates",
    name: "模板管理",
    version: "1.2.0",
    dependencies: [], // 无依赖
  },
  activate(ctx) {
    // 创建 TemplateManager 并暴露给其他插件
    const manager = new TemplateManager(ctx.editor);
    ctx.editor.__templateManager__ = manager;
    ctx.editor.__templateRegistry__ = TemplateRegistry;
  },
};
```

---

### 使用方式 (Usage Patterns)

#### 从其他插件使用模板功能

**方式 1: 通过 TemplateManager 服务 (推荐)**

```typescript
// 在 manifest 中声明依赖
manifest: {
  dependencies: ["leafer-flow.templates"]
}

// 在命令或插件中使用
async run(editor) {
  const manager = (editor as any).__templateManager__;
  const result = await manager.insertTemplate("approval", {
    offsetX: 150,
    offsetY: 100,
    scale: 0.8
  });
  return result;
}
```

**方式 2: 通过 TemplateRegistry (只读访问)**

```typescript
import { TemplateRegistry } from "../templates/registry";

// 检查模板可用性
if (TemplateRegistry.isValidKind(kind)) {
  const template = TemplateRegistry.getTemplate(kind);
  const style = TemplateRegistry.getNodeStyle(kind);
}
```

**方式 3: 直接导入 (Agent 工具，向后兼容)**

```typescript
import { templateMap, getTemplateStyle } from "../../templates/defs";

// 继续使用现有代码
const data = templateMap[kind]();
```

---

### 依赖关系 (Dependency Graph)

```
Agent Plugin
  ↓ imports
templates/defs.ts  ←─ 向后兼容，Agent 无需改动

template-actions Plugin
  ↓ depends on
templates Plugin  ←─ 新的服务依赖
  ↓ uses
TemplateManager
  ↓ uses
TemplateRegistry
  ↓ reads
templates/defs.ts
```

---

### 扩展点 (Extension Points)

#### 添加新的模板类型

1. **在 templates/defs.ts 中添加模板定义**

   ```typescript
   export const templateMap: Record<TemplateKind, () => TemplateDefinition> = {
     // ...
     myCustomTemplate: () => ({ graph: {...}, settings: {...}, message: "..." })
   }

   // 更新 TemplateKind 类型
   export type TemplateKind = "approval" | ... | "myCustomTemplate"
   ```

2. **在 TemplateRegistry 中添加显示名称**

   ```typescript
   static getTemplateName(kind: TemplateKind): string {
     const nameMap: Record<TemplateKind, string> = {
       // ...
       myCustomTemplate: "自定义模板"
     }
     return nameMap[kind] || kind;
   }
   ```

3. **在 Agent 工具中添加支持** (如果需要)

   ```typescript
   export const TEMPLATE_NAMES = {
     // ...
     MY_CUSTOM_TEMPLATE: "myCustomTemplate",
   } as const;

   // 更新 insert_template 工具的 enum
   ```

#### 添加自定义模板加载

创建 `src/editor/builtin/templates/custom-loader.ts`:

```typescript
import { TemplateRegistry } from "./registry";

export async function loadCustomTemplates() {
  // 从 API 或文件加载自定义模板
  const custom = await fetch("/api/custom-templates").then((r) => r.json());

  // 动态注册到 registry
  // (需要修改 TemplateRegistry 支持动态加载)
}
```

#### 支持模板版本控制 (Pro Feature)

创建 `src/editor/builtin/templates/version-manager.ts`:

```typescript
export class TemplateVersionManager {
  // 管理模板的不同版本
  // 支持迁移、备份、回滚等
  async migrateTemplate(
    oldVersion: TemplateDefinition,
  ): Promise<TemplateDefinition> {}
}
```

---

### 最佳实践 (Best Practices)

#### ✅ 推荐做法

1. **在插件中声明模板依赖**

   ```typescript
   manifest: {
     dependencies: ["leafer-flow.templates"];
   }
   ```

2. **使用 TemplateManager 处理完整流程**

   ```typescript
   const manager = editor.__templateManager__;
   const result = await manager.insertTemplate(kind, options);
   ```

3. **对错误进行处理**
   ```typescript
   if (!result.success) {
     console.error(result.message);
     // 用户提示等
   }
   ```

#### ❌ 避免做法

1. **不要直接修改 templateMap**

   ```typescript
   // ❌ 错误
   templateMap.approval = () => customDefinition;

   // ✅ 正确 - 使用 TemplateRegistry 或扩展点
   ```

2. **不要绕过 TemplateManager 的事务处理**

   ```typescript
   // ❌ 错误 - 会导致历史/自动保存不一致
   insertTemplateFlow(editor, graph, styles);

   // ✅ 正确
   manager.insertTemplate(kind);
   ```

3. **不要在 Agent 工具中调用 do-template.ts**
   ```typescript
   // ✅ 已兼容 - 继续使用 templates/defs.ts
   const data = templateMap[kind]();
   ```

---

### 迁移指南 (Migration Guide)

#### 从旧的 do-template.ts 迁移

**Before (旧方式)**

```typescript
import { doInsertTemplate } from "../action/do-template";

// 在模板操作中
return doInsertTemplate(editor, "approval");
```

**After (新方式)**

```typescript
const manager = editor.__templateManager__;
return await manager.insertTemplate("approval");
```

#### 添加插件依赖

```typescript
// 在插件 manifest 中
export const myPlugin: EditorPluginModule = {
  manifest: {
    id: "leafer-flow.my-plugin",
    dependencies: ["leafer-flow.templates"], // ← 添加这一行
  },
  activate(ctx) {
    // 现在可以使用 TemplateManager
    const manager = (ctx.editor as any).__templateManager__;
  },
};
```

---

### 故障排查 (Troubleshooting)

#### Q: 模板插入失败，提示 "模板管理器未初始化"

**A**: 检查插件的 manifest 中是否声明了 `dependencies: ["leafer-flow.templates"]`

```typescript
manifest: {
  dependencies: ["leafer-flow.templates"]; // ← 必需
}
```

#### Q: Agent 工具中导入 templateMap 报错

**A**: 检查导入路径是否正确

```typescript
// ✅ 正确
import { templateMap } from "../../templates/defs";

// ❌ 错误 - registry.ts 是为其他用途导出的
import { templateMap } from "../templates/registry";
```

#### Q: 自定义模板没有显示在 TemplateRegistry.getTemplateName() 中

**A**: 需要在 TemplateRegistry 的 nameMap 中添加对应项

```typescript
static getTemplateName(kind: TemplateKind): string {
  const nameMap: Record<TemplateKind, string> = {
    myCustomTemplate: "自定义模板"  // ← 添加
  }
  return nameMap[kind] || kind;
}
```

---

### 相关文件清单 (File Manifest)

| 文件                                                   | 职责                      | 修改频率         |
| ------------------------------------------------------ | ------------------------- | ---------------- |
| `src/editor/builtin/templates/index.ts`                | 插件入口、TemplateManager | 低（扩展功能时） |
| `src/editor/builtin/templates/registry.ts`             | TemplateRegistry、访问层  | 低（新增模板时） |
| `src/editor/templates/defs.ts`                         | 模板定义                  | 中（常规维护）   |
| `src/editor/templates/insert.ts`                       | 图形插入逻辑              | 低（稳定）       |
| `src/editor/action/do-template.ts`                     | 旧的操作层（逐步弃用）    | 低（保持兼容）   |
| `src/editor/builtin/plugins/template-actions/index.ts` | 命令注册                  | 中（UI 变化时）  |
| `src/editor/builtin/plugins/index.ts`                  | 插件加载                  | 低（新插件时）   |

---

### 版本历史 (Version History)

**v1.2.0** (2026-08-19)

- ✅ 重构模板系统为独立插件
- ✅ 添加 TemplateManager 服务
- ✅ 添加 TemplateRegistry 访问层
- ✅ 保持 Agent 工具向后兼容
- ✅ 支持位置和缩放参数

**v1.1.x** (旧架构)

- 模板定义在 templates/defs.ts
- 操作在 do-template.ts
- 紧耦合架构
