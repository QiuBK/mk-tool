# 08 -- System Architecture & Tech Selection (DevToolKit Edge Extension)

> 08 describes **architecture decisions and tech selection rationale**.

---

| Item | Value |
|---|---|
| Module ID | DEVTOOL |
| Module Name | DevToolKit Edge Extension |
| Doc Version | v0.1 |
| Stage | Design (How - Architecture Decisions) |
| Upstream | `05` UserStory / `06` FSD / `07` NFR |
| Downstream | -> `09` API / `10` Data Model / `12` Plan |

---

## 1. Architecture Overview

### 1.1 System Context

```
+-------------------------------------------------------------+
|                    Edge Browser                              |
|                                                              |
|  +-------------------+     +-----------------------------+  |
|  |   Side Panel UI   |     |   Background Service Worker  |  |
|  |   (React SPA)     |<--->|   (TypeScript)               |  |
|  |                   |     |                              |  |
|  |  +-------------+  |     |  +------------------------+  |  |
|  |  | Tool Pages   |  |     |  | Chrome Extension APIs  |  |  |
|  |  | - JSON       |  |     |  | - storage.local        |  |  |
|  |  | - Base64     |  |     |  | - sidePanel            |  |  |
|  |  | - Timestamp  |  |     |  | - runtime              |  |  |
|  |  | - Cron       |  |     |  +------------------------+  |  |
|  |  | - URL        |  |     |                              |  |
|  |  | - Color      |  |     +-----------------------------+  |
|  |  | - Hash       |  |                                      |
|  |  +-------------+  |                                      |
|  |  | History Panel|  |                                      |
|  |  +-------------+  |                                      |
|  +-------------------+                                      |
|                                                              |
|  +-------------------+                                      |
|  | chrome.storage.   |                                      |
|  | local             |                                      |
|  +-------------------+                                      |
+-------------------------------------------------------------+
         |
         | NO network requests (except extension updates)
         v
    [ No External Services ]
```

### 1.2 Architecture Style

| Decision | Selection | Rationale |
|----------|----------|-----------|
| 扩展架构 | Side Panel + Service Worker | Side Panel提供持久化侧边栏体验，优于popup的临时弹窗；Service Worker管理扩展生命周期和存储 |
| UI框架 | React 18 + TypeScript | 用户需求确认；TypeScript提供类型安全，React组件化适合多工具页面 |
| 构建工具 | Vite + CRXJS | Vite构建速度快，CRXJS提供Chrome Extension开发HMR支持 |
| 状态管理 | Zustand | 轻量级，API简洁，适合中小型扩展应用，无Redux的样板代码开销 |
| 样式方案 | CSS Modules + CSS Custom Properties | CSS Modules避免样式冲突，Custom Properties实现主题切换 |
| 路由方案 | React Router (Memory Router) | Memory Router不依赖URL，适合扩展单页面场景 |

## 2. Extension Layer Structure

| Layer | File(s) | Allowed | Forbidden |
|-------|---------|---------|-----------|
| **Manifest** | `manifest.json` | 声明权限、注册side_panel、service_worker | 业务逻辑 |
| **Side Panel** | `src/sidepanel/` | UI渲染、用户交互、调用Service层 | 直接操作chrome.storage |
| **Service Layer** | `src/services/` | 数据处理、业务逻辑、chrome.storage操作 | DOM操作、UI渲染 |
| **Utils** | `src/utils/` | 纯函数工具（格式化、编解码等） | 副作用操作、状态依赖 |
| **Background** | `src/background/` | 扩展生命周期管理、消息监听 | UI渲染 |
| **Types** | `src/types/` | TypeScript类型定义 | 运行时代码 |

## 3. Frontend Architecture

| Item | Selection | Rationale |
|------|----------|-----------|
| UI Framework | React 18 | 组件化开发，生态成熟，用户确认 |
| Build Tool | Vite 5 + @crxjs/vite-plugin | 快速HMR，原生ESM，CRXJS支持扩展开发 |
| State Management | Zustand | 轻量（< 1KB），无Provider包裹，适合扩展场景 |
| HTTP Client | 不适用 | 纯本地处理，无HTTP请求 |
| CSS Solution | CSS Modules + CSS Custom Properties | 作用域隔离 + 主题变量 |
| Testing | Vitest + React Testing Library | Vite原生测试框架，React组件测试标准方案 |
| Linting | ESLint + Prettier | 代码质量保障 |

## 4. Tool Processing Architecture

```
+------------------+     +------------------+     +------------------+
|   UI Component   |     |   Service Layer  |     |   Utils (Pure)   |
|                  |     |                  |     |                  |
|  - Input capture |---->|  - Validation    |---->|  - jsonFormat()  |
|  - Result render |<----|  - Error mapping |<----|  - jsonMinify()  |
|  - Copy action   |     |  - State persist |     |  - base64Enc()   |
|  - History save  |     |  - History CRUD  |     |  - base64Dec()   |
|                  |     |                  |     |  - tsConvert()   |
+------------------+     +------------------+     |  - cronParse()   |
                                                   |  - urlEncode()   |
                                                   |  - colorConv()   |
                                                   |  - hashCompute() |
                                                   +------------------+
                                                          |
                                                   (Web Worker for
                                                    large inputs)
```

| Component | File | Config Detection | Timeout | Error Handling |
|-----------|------|-----------------|---------|---------------|
| JsonService | `src/services/jsonService.ts` | 输入大小检测 | 5s (大文本) | 返回INVALID_JSON / INPUT_TOO_LARGE |
| Base64Service | `src/services/base64Service.ts` | 输入大小检测 | 3s | 返回INVALID_BASE64 / EMPTY_INPUT |
| TimestampService | `src/services/timestampService.ts` | 输入格式检测 | 1s | 返回INVALID_TIMESTAMP / INVALID_DATE |
| CronService | `src/services/cronService.ts` | 表达式语法检测 | 2s | 返回INVALID_CRON_EXPRESSION |
| UrlService | `src/services/urlService.ts` | 输入大小检测 | 3s | 返回EMPTY_INPUT |
| ColorService | `src/services/colorService.ts` | 格式检测 | 1s | 返回INVALID_COLOR_FORMAT |
| HashService | `src/services/hashService.ts` | 输入大小检测 | 5s (大文本) | 返回UNSUPPORTED_ALGORITHM |
| HistoryService | `src/services/historyService.ts` | 存储容量检测 | 1s | 返回STORAGE_QUOTA_EXCEEDED |

## 5. Data Storage Architecture

### 5.1 Storage Evolution Roadmap

| Phase | Storage | Change Scope | Description |
|-------|---------|-------------|------------|
| **P0 (Current)** | chrome.storage.local | -- | 使用chrome.storage.local存储历史记录和用户偏好 |
| P1 | IndexedDB (可选) | 新增 | 如历史记录数据量增大，迁移至IndexedDB |

### 5.2 Storage Schema

| Key | Type | Description |
|-----|------|------------|
| `devtool_history` | HistoryItem[] | 历史记录列表 |
| `devtool_preferences` | Preferences | 用户偏好设置（主题等） |
| `devtool_tool_states` | Record<string, ToolState> | 各工具状态持久化 |

## 6. Deployment Architecture

| Service | Port | Start Command |
|---------|------|--------------|
| Dev Server | 5173 | `npm run dev` |
| Build | N/A | `npm run build` |
| Preview | 4173 | `npm run preview` |

### Extension Loading

| Step | Action |
|------|--------|
| 1 | `npm run build` 生成dist目录 |
| 2 | Edge浏览器打开 `edge://extensions/` |
| 3 | 开启"开发人员模式" |
| 4 | 点击"加载解压缩的扩展"，选择dist目录 |

## 7. ADR (Architecture Decision Records)

| ADR | Decision | Core Rationale |
|-----|----------|---------------|
| ADR-001 | 使用Side Panel而非Popup | Popup在点击外部时自动关闭，无法保持工具状态；Side Panel持久显示，适合开发者工具箱场景。Side Panel API自Chrome 114/Edge 114起可用。 |
| ADR-002 | 使用Zustand而非Redux | 扩展应用规模中等，Zustand的轻量API（< 1KB）更适合，避免Redux的action/reducer样板代码。Zustand支持persist middleware可直接对接chrome.storage。 |
| ADR-001 | 使用Web Worker处理大文本 | JSON格式化等操作在主线程执行会阻塞UI渲染，Web Worker将计算移至后台线程，保证UI响应性。输入 > 100KB时自动启用。 |
| ADR-004 | 使用CSS Custom Properties实现主题 | 相比CSS-in-JS运行时开销，Custom Properties是浏览器原生支持，零运行时成本，且支持动态切换。 |
| ADR-005 | 使用cronstrue库解析Cron表达式 | cronstrue是成熟的Cron表达式解析库（MIT协议），支持多语言，将Cron表达式转为自然语言描述。避免自行实现复杂的Cron语法解析。 |

## 8. Security Architecture

| Layer | Current Measure | Production Improvement |
|-------|----------------|----------------------|
| Auth | 不适用（无远程服务） | 不适用 |
| CORS | 不适用（无网络请求） | 不适用 |
| Secrets | 不涉及 | 不涉及 |
| Data Isolation | chrome.storage.local沙箱隔离 | 保持 |
| CSP | manifest.json配置严格CSP | 限制inline script/style |
| Input Validation | Service层统一校验 | 保持 |

---

| Version | Date | Description |
|---------|------|------------|
| v0.1 | 2026-05-14 | Initial draft |
