# 格式化和 Lint 配置指南

## 概述

本项目使用 **oxlint** 作为主要的代码检查和格式化工具，完全移除了 ESLint 和 Prettier，实现了更快的代码检查速度。

## 工具链

- **oxlint** (~1.52.0) - 快速的 JavaScript/TypeScript Linter
- **TypeScript** (~5.9.3) - 类型检查
- **EditorConfig** - 编辑器基础配置

## 配置文件

### 1. `.oxlintrc.json` - oxlint 配置

```json
{
  "categories": {
    "correctness": "error",
    "suspicious": "warn",
    "perf": "warn",
    "style": "off",
    "restriction": "off",
    "pedantic": "off"
  },
  "plugins": ["typescript", "vue"],
  "env": {
    "browser": true,
    "es2021": true
  }
}
```

**规则说明**：
- `correctness`: 代码正确性问题（错误级别）
- `suspicious`: 可疑代码（警告级别）
- `perf`: 性能相关（警告级别）
- `style`: 样式问题（已关闭）
- `restriction`: 限制性规则（已关闭）

### 2. `.editorconfig` - 编辑器配置

```ini
[*.{js,jsx,mjs,cjs,ts,tsx,mts,cts,vue,css,scss,sass,less,styl}]
charset = utf-8
indent_size = 2
indent_style = space
insert_final_newline = true
trim_trailing_whitespace = true
end_of_line = lf
max_line_length = 100
```

### 3. TypeScript 配置

- `tsconfig.json` - 主配置文件
- `tsconfig.app.json` - 应用代码配置
- `tsconfig.node.json` - 构建工具配置

## NPM 脚本

```json
{
  "scripts": {
    "lint": "oxlint -c .oxlintrc.json --fix",
    "format": "oxlint -c .oxlintrc.json --fix"
  }
}
```

### 使用方法

```bash
# 检查并修复代码
pnpm run lint

# 格式化代码（与 lint 相同）
pnpm run format

# 构建前检查
pnpm run build
```

## 从 ESLint/Prettier 迁移

### 已移除的配置文件

- ❌ `.prettierrc.json` - Prettier 配置
- ❌ `eslint.config.ts` - ESLint Flat Config

### 已移除的依赖

- `prettier`
- `@prettier/plugin-oxc`
- `eslint`
- `@vue/eslint-config-prettier`
- `@vue/eslint-config-typescript`
- `eslint-plugin-vue`
- `eslint-plugin-oxlint`
- `vue-tsc` - 类型检查（TypeScript 编译器仍可用）

## 编辑器配置

### VS Code

推荐安装以下扩展：

1. **EditorConfig for VS Code** - 支持 `.editorconfig`
2. **Volar** - Vue 3 支持
3. **oxlint** - oxlint 扩展（如果可用）

在 `.vscode/settings.json` 中添加：

```json
{
  "editor.formatOnSave": false,
  "editor.defaultFormatter": "dbaeumer.vscode-eslint",
  "editor.codeActionsOnSave": {
    "source.fixAll": "explicit"
  }
}
```

### WebStorm / IntelliJ IDEA

1. Settings → Languages & Frameworks → JavaScript → Code Quality Tools → ESLint
2. 取消勾选 "Enable ESLint"
3. 确保编辑器遵循 `.editorconfig` 设置

## CI/CD 集成

在 GitHub Actions 中使用：

```yaml
- name: Lint
  run: pnpm run lint
```

## 注意事项

1. **oxlint 不支持所有 ESLint 规则**：某些特定的 ESLint 规则可能在 oxlint 中不可用
2. **自动修复**：`--fix` 标志会自动修复可修复的问题
3. **类型检查**：oxlint 只做语法检查，不做完整的类型检查。如需类型检查，可以添加 `vue-tsc`
4. **Vue 支持**：通过 `vue-plugin` 支持 Vue 文件的检查

## 故障排除

### 问题：oxlint 检测不到 Vue 文件

**解决方案**：确保配置中启用了 `vue-plugin`

```json
{
  "plugins": ["typescript", "vue"]
}
```

### 问题：类型错误未检测

**解决方案**：oxlint 只做语法检查，不做完整类型检查。如需类型检查：

```bash
# 安装 vue-tsc
pnpm add -D vue-tsc

# 添加到 package.json
"type-check": "vue-tsc --noEmit"
```

### 问题：某些规则不生效

**解决方案**：检查规则名称是否正确，查看所有可用规则：

```bash
npx oxlint --rules
```

## 参考资料

- [oxlint 官方文档](https://oxc-project.github.io/oxlint/)
- [oxlint 配置文档](https://oxc-project.github.io/oxlint/usage/configuration.html)
- [EditorConfig 官网](https://editorconfig.org/)
