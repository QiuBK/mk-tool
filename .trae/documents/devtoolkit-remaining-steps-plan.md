# DevToolKit Edge Extension - 剩余实施计划（Step 14-17）

## Summary

DevToolKit Edge 浏览器扩展已完成 Step 1-13 的核心功能实现：7个工具（JSON/Base64/时间戳/Cron/URL/颜色/哈希）、JSON转Excel导出、历史记录、主题切换等全部就绪。TypeScript 编译零错误，Vite 生产构建成功，36个单元测试全部通过。

**当前问题**：构建产物 ~1.28MB（365KB gzipped），Vite 报 chunk size 超过 500KB 警告；缺少集成测试；未做安全审计；未验证最终打包。

**本计划目标**：完成 Step 14-17，即性能优化、测试完善、安全审计、打包发布。

---

## Current State Analysis

### 已完成
- 项目脚手架：Vite + React 19 + TypeScript 6 + CRXJS + Zustand 5
- 7个工具 Service + UI 组件全部实现
- 36个 Service 层单元测试通过
- 生产构建成功（dist 目录已有产物）
- 主题切换（light/dark/system）+ CSS Custom Properties
- 历史记录 CRUD + 自动淘汰
- 复制按钮 + 键盘快捷键 Ctrl+1~7

### 待解决问题
1. **Bundle 过大**：exceljs 库导致主 chunk ~1.28MB，所有工具组件静态导入
2. **缺少懒加载**：[App.tsx](file:///workspace/devtoolkit/src/App.tsx) 中 7 个工具组件全部静态 import
3. **无输入节流**：textarea onChange 无 debounce，大文本输入时频繁触发重渲染
4. **测试覆盖不足**：historyService 无测试，无组件测试，无集成测试
5. **未做安全审计**：未运行 npm audit，未验证 CSP 和权限最小化

---

## Proposed Changes

### Step 14: 性能优化

#### 14.1 React.lazy 懒加载工具组件

**文件**: [App.tsx](file:///workspace/devtoolkit/src/App.tsx)

**问题**: 当前 7 个工具组件全部静态导入，exceljs 等大库被打入主 chunk，导致首屏加载慢。

**方案**:
- 将 `TOOL_COMPONENTS` 中的静态 import 改为 `React.lazy(() => import(...))`
- 在 `<ActiveComponent />` 外层包裹 `<Suspense fallback={...}>`
- exceljs 仅在 JsonTool 中使用，懒加载后 JSON 工具的 chunk 会独立分离

**具体改动**:
```tsx
// Before (App.tsx L7-L13):
import { JsonTool } from './tools/JsonTool/JsonTool'
import { Base64Tool } from './tools/Base64Tool/Base64Tool'
// ... 7个静态导入

// After:
const JsonTool = React.lazy(() => import('./tools/JsonTool/JsonTool'))
const Base64Tool = React.lazy(() => import('./tools/Base64Tool/Base64Tool'))
// ... 7个懒加载

// Suspense 包裹:
<Suspense fallback={<div className={styles.loading}>加载中...</div>}>
  <ActiveComponent />
</Suspense>
```

#### 14.2 输入节流

**文件**: 各工具组件中的 textarea onChange

**方案**: 创建通用 `useDebouncedCallback` hook，对 textarea 的 onChange 进行 300ms 节流，减少大文本输入时的重渲染。

**新建文件**: `src/hooks/useDebouncedCallback.ts`

```ts
import { useRef, useCallback } from 'react'

export function useDebouncedCallback<T extends (...args: unknown[]) => void>(
  callback: T,
  delay: number
): T {
  const timerRef = useRef<ReturnType<typeof setTimeout>>()
  return useCallback((...args: unknown[]) => {
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => callback(...args), delay)
  }, [callback, delay]) as T
}
```

**应用位置**:
- [JsonTool.tsx](file:///workspace/devtoolkit/src/tools/JsonTool/JsonTool.tsx) L85: `onChange={(e) => setInput(e.target.value)}`
- [Base64Tool.tsx](file:///workspace/devtoolkit/src/tools/Base64Tool/Base64Tool.tsx): textarea onChange
- [UrlTool.tsx](file:///workspace/devtoolkit/src/tools/UrlTool/UrlTool.tsx): textarea onChange
- [HashTool.tsx](file:///workspace/devtoolkit/src/tools/HashTool/HashTool.tsx): textarea onChange

**注意**: 仅对 setInput（状态更新）做节流，不对受控 input 的 value 做节流（否则输入会卡顿）。方案改为：textarea 保持非受控或使用 `useDeferredValue`。

**最终方案**: 使用 React 19 的 `useDeferredValue` 对 input state 的派生计算（如 inputSize 计算）做延迟，而非节流 onChange 本身，避免输入卡顿。

#### 14.3 Vite 构建配置优化

**文件**: [vite.config.ts](file:///workspace/devtoolkit/vite.config.ts)

**方案**: 添加 manualChunks 配置，将 exceljs 单独拆包：

```ts
build: {
  rollupOptions: {
    input: { sidepanel: 'src/sidepanel/index.html' },
    output: {
      manualChunks: {
        exceljs: ['exceljs'],
        vendor: ['react', 'react-dom', 'zustand'],
      },
    },
  },
},
```

**验证**: 构建后主 chunk < 500KB，exceljs chunk 独立按需加载

---

### Step 15: 测试完善

#### 15.1 historyService 单元测试

**新建文件**: `src/services/__tests__/historyService.test.ts`

**测试用例**:
- saveHistoryItem 保存成功
- getHistoryList 返回倒序列表
- deleteHistoryItem 删除成功
- clearHistory 清空成功
- 超过 maxItems 自动淘汰最旧记录
- 输入截断（> 10KB）

**注意**: historyService 依赖 chrome.storage.local，测试中需 mock `chrome.storage.local`（已有 jest-chrome 依赖，或手动 mock localStorage fallback）

#### 15.2 组件测试

**新建文件**:
- `src/components/__tests__/CopyButton.test.tsx` - 复制功能 + 反馈状态
- `src/components/__tests__/ThemeToggle.test.tsx` - 主题切换 + 持久化
- `src/tools/__tests__/JsonTool.test.tsx` - 格式化/压缩/校验/导出按钮交互

#### 15.3 Store 集成测试

**新建文件**: `src/store/__tests__/store.test.ts`

**测试用例**:
- 初始状态正确
- setActiveTool 切换工具
- setToolState 保存/恢复工具状态
- setTheme 切换主题 + resolvedTheme 正确
- persist middleware 持久化到 storage

**验证**: `npm run test` 全部通过，测试数量从 36 增至 ~55+

---

### Step 16: 安全审计

#### 16.1 依赖安全检查

**操作**: 运行 `npm audit`，检查是否有 high/critical 级别漏洞

**修复策略**:
- high/critical: 必须修复（升级依赖或寻找替代）
- moderate/low: 评估后决定是否修复

#### 16.2 CSP 验证

**文件**: [manifest.json](file:///workspace/devtoolkit/manifest.json)

**验证项**:
- `content_security_policy.extension_pages` = `script-src 'self'; object-src 'self'`
- 无 `unsafe-eval`、`unsafe-inline`
- 无外部 CDN 脚本引用

#### 16.3 权限审查

**文件**: [manifest.json](file:///workspace/devtoolkit/manifest.json)

**验证项**:
- permissions 仅包含 `storage` + `sidePanel`（最小权限原则）
- 无 `tabs`、`<all_urls>` 等宽泛权限

#### 16.4 网络请求验证

**验证项**:
- 所有数据处理在本地完成，无任何出站网络请求
- Excel 导出使用 Blob URL + 立即释放（[jsonService.ts](file:///workspace/devtoolkit/src/services/jsonService.ts) L141-L148 已实现）
- 无远程脚本加载

**验证**: `npm audit` 无 high/critical，CSP 和权限配置正确

---

### Step 17: 打包发布

#### 17.1 生产构建验证

**操作**:
1. `npm run typecheck` - TypeScript 编译零错误
2. `npm run lint` - ESLint 零错误
3. `npm run test` - 所有测试通过
4. `npm run build` - 生产构建成功

#### 17.2 构建产物验证

**验证项**:
- `dist/` 目录结构正确（manifest.json、sidepanel HTML、JS/CSS assets、icons）
- 主 chunk < 500KB（懒加载优化后）
- 总安装包 < 2MB（规格要求）
- service-worker-loader.js 存在
- manifest.json 中路径正确

#### 17.3 Edge 加载测试准备

**验证项**:
- 在 Edge `edge://extensions/` 开发者模式下加载 dist 目录
- Side Panel 正常打开
- 所有 7 个工具功能正常
- 主题切换正常
- 历史记录正常

**验证**: 构建成功，产物结构正确，包体积 < 2MB

---

## Assumptions & Decisions

| 决策项 | 选择 | 理由 |
|--------|------|------|
| 懒加载方案 | React.lazy + Suspense | 标准做法，Vite 原生支持 dynamic import 代码分割 |
| 输入节流方案 | useDeferredValue（React 19） | 比 debounce 更自然，不阻塞用户输入 |
| Web Worker | 暂不实现 | 1MB 输入限制已足够保护 UI，Worker 增加复杂度但收益有限 |
| exceljs 拆包 | manualChunks 独立拆包 | exceljs ~900KB，仅 JSON 工具使用，按需加载 |
| 测试 mock | localStorage fallback 路径 | historyService 已有 localStorage fallback，测试中直接使用 |

## Verification Steps

1. **性能验证**: `npm run build` 后主 chunk < 500KB，无 chunk size 警告
2. **测试验证**: `npm run test` 全部通过，测试数量 ≥ 55
3. **安全验证**: `npm audit` 无 high/critical，CSP/权限配置正确
4. **打包验证**: 总安装包 < 2MB，dist 结构完整
5. **功能验证**: 所有 7 个工具 + 主题 + 历史 + 复制功能正常
