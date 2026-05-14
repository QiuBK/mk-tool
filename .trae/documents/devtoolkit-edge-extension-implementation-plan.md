# DevToolKit Edge Extension - 实施计划

## Summary

基于 `/workspace/spec/` 下的14份规格文档，从零构建 DevToolKit Edge 浏览器扩展。完整实现 S1-S4 四个阶段，包含7个工具（JSON/Base64/时间戳/Cron/URL/颜色/哈希）、JSON转Excel导出、历史记录、主题切换等全部功能。

**技术栈**: React 18 + TypeScript + Vite 5 + CRXJS + Zustand + CSS Modules + ExcelJS + cronstrue + Vitest

**当前状态**: 工作区仅有规格文档（`/workspace/spec/`），无任何源代码，需从零搭建。

---

## Proposed Changes

### Step 1: 项目脚手架 (W1)

**目标**: 初始化 Vite + React + TypeScript + CRXJS 项目，配置 manifest.json，注册 Side Panel

**操作**:
1. 使用 `npm create vite@latest` 初始化 React + TypeScript 项目
2. 安装核心依赖:
   - `@crxjs/vite-plugin` - Chrome Extension HMR 支持
   - `zustand` - 状态管理
   - `exceljs` - Excel 文件生成
   - `cronstrue` - Cron 表达式自然语言解析
   - `cron-parser` - Cron 表达式解析与下次执行时间计算
3. 安装开发依赖:
   - `vitest` + `@testing-library/react` + `jsdom` - 测试
   - `eslint` + `prettier` - 代码质量
   - `jest-chrome` - Chrome API mock
4. 创建 `manifest.json` (Manifest V3):
   - permissions: `["storage", "sidePanel"]`
   - side_panel.default_path 指向 sidepanel.html
   - background.service_worker 指向 background.ts
   - CSP: `script-src 'self'; object-src 'self'`
5. 配置 `vite.config.ts` 集成 CRXJS
6. 创建目录结构:
   ```
   src/
   ├── sidepanel/          # Side Panel UI (React SPA)
   │   ├── main.tsx
   │   ├── App.tsx
   │   └── index.html
   ├── components/         # 通用UI组件
   │   ├── CopyButton/
   │   ├── ToolNav/
   │   └── HistoryPanel/
   ├── tools/              # 各工具页面组件
   │   ├── JsonTool/
   │   ├── Base64Tool/
   │   ├── TimestampTool/
   │   ├── CronTool/
   │   ├── UrlTool/
   │   ├── ColorTool/
   │   └── HashTool/
   ├── services/           # 业务逻辑层
   │   ├── jsonService.ts
   │   ├── base64Service.ts
   │   ├── timestampService.ts
   │   ├── cronService.ts
   │   ├── urlService.ts
   │   ├── colorService.ts
   │   ├── hashService.ts
   │   └── historyService.ts
   ├── utils/              # 纯函数工具
   ├── store/              # Zustand store
   │   └── index.ts
   ├── types/              # TypeScript 类型定义
   │   └── index.ts
   ├── styles/             # 全局样式与主题变量
   │   └── themes.css
   └── background/         # Service Worker
       └── index.ts
   ```

**验证**: `npm run dev` 启动开发服务器，扩展可加载到 Edge

### Step 2: 导航与布局 (W2)

**目标**: 实现侧边栏导航组件和工具页面容器

**操作**:
1. 创建 `ToolNav` 组件 - 左侧工具导航列表
   - 7个工具项: JSON / Base64 / 时间戳 / Cron / URL / 颜色 / 哈希
   - 当前选中高亮 + 左侧指示条
   - 鼠标悬停反馈
2. 创建 `App.tsx` 主布局 - 顶部操作栏 + 左侧导航 + 右侧内容区
3. 创建各工具页面的占位组件
4. 使用 Memory Router 实现工具间路由切换
5. 实现键盘快捷键 Ctrl+1~7 切换工具

**验证**: 点击导航切换工具，当前工具高亮，快捷键可用

### Step 3: 主题系统 (W3)

**目标**: CSS Custom Properties 实现深色/浅色主题切换

**操作**:
1. 创建 `themes.css` - 定义两套 CSS Custom Properties
   - `--color-bg`, `--color-text`, `--color-primary`, `--color-border` 等
2. 创建 `ThemeToggle` 组件 - 太阳/月亮图标切换
3. 默认跟随系统 `prefers-color-scheme`
4. 主题偏好通过 Zustand persist middleware 持久化到 chrome.storage.local

**验证**: 切换主题后UI颜色变化，刷新后保持

### Step 4: 状态管理 (W4)

**目标**: Zustand store 配置，工具状态持久化

**操作**:
1. 创建 Zustand store:
   - `activeTool` - 当前活跃工具
   - `toolStates` - 各工具输入/输出状态
   - `theme` - 主题设置
   - `historyOpen` - 历史面板开关
   - `clipboardFeedback` - 复制反馈
2. 配置 persist middleware 对接 chrome.storage.local
3. 实现工具状态自动保存（300ms 节流）
4. 实现工具切换时状态恢复

**验证**: 切换工具后返回，输入内容保留

### Step 5: JSON 工具 (W5)

**目标**: JSON 格式化/压缩/校验/Excel导出 Service + UI

**操作**:
1. 创建 `src/types/index.ts` - 定义所有 ServiceResult/ServiceError/DTO 类型
2. 创建 `src/services/jsonService.ts`:
   - `jsonFormat(input)` - 格式化（2空格缩进）+ 统计键数/深度
   - `jsonMinify(input)` - 压缩 + 统计原始/压缩大小/压缩率
   - `jsonValidate(input)` - 校验 + 错误行号/列号定位
   - `jsonExportExcel(input, options)` - ExcelJS 生成 .xlsx Blob
3. 创建 `JsonTool` 组件:
   - 输入区: textarea + 输入大小提示
   - 操作按钮: 格式化 / 压缩 / 校验 / 导出Excel
   - 输出区: 结果显示 + 复制按钮
   - Excel导出选项: 工作表名称输入框
   - 错误状态: 高亮错误行号 + 错误消息
4. Excel 导出逻辑:
   - 验证输入为 JSON 数组
   - 提取所有对象键的并集作为列标题
   - 嵌套对象以 JSON 字符串形式写入
   - 数组值以逗号分隔字符串写入
   - null 值写入空单元格
   - 使用 Blob URL + `<a download>` 触发下载，下载后释放 URL

**验证**: 格式化/压缩/校验/导出Excel 全部可用，错误定位准确

### Step 6: Base64 工具 (W6)

**目标**: Base64 编解码 Service + UI

**操作**:
1. 创建 `src/services/base64Service.ts`:
   - `base64Encode(input)` - UTF-8 文本编码
   - `base64Decode(input)` - Base64 解码
2. 创建 `Base64Tool` 组件:
   - 输入区 + 编码/解码按钮 + 输出区 + 复制按钮
   - UTF-8 中文支持

**验证**: 中英文编解码往返一致

### Step 7: 时间戳工具 (W7)

**目标**: 时间戳转换 Service + UI + 实时时间戳

**操作**:
1. 创建 `src/services/timestampService.ts`:
   - `timestampConvert(input, timezone)` - 时间戳转日期（秒/毫秒自动识别）
   - `dateToTimestamp(input, timezone)` - 日期转时间戳
   - `getCurrentTimestamp()` - 获取当前时间戳
2. 创建 `TimestampTool` 组件:
   - 时间戳输入框 + 日期选择器 + 时区选择
   - 实时当前时间戳显示（每秒更新）
   - 转换结果 + 复制按钮

**验证**: 秒级/毫秒级自动识别，实时时间戳每秒更新

### Step 8: Cron 工具 (W8)

**目标**: Cron 生成/解析/预览 Service + UI + 预设

**操作**:
1. 安装 `cronstrue` + `cron-parser`
2. 创建 `src/services/cronService.ts`:
   - `cronGenerate(config)` - 可视化配置生成表达式
   - `cronParse(expression)` - 解析为自然语言 + 字段拆分
   - `cronNextRuns(expression, count)` - 计算下次执行时间
3. 创建 `CronTool` 组件:
   - 6个字段选择器（秒/分/时/日/月/周）
   - 表达式输入框（双向同步）
   - 自然语言描述
   - 下次5次执行时间预览
   - 预设快捷选择按钮

**验证**: 可视化生成 + 手动编辑双向同步，下次执行时间正确

### Step 9: 复制功能 (W9)

**目标**: 通用复制按钮组件

**操作**:
1. 创建 `CopyButton` 组件:
   - 调用 `navigator.clipboard.writeText()`
   - 复制后按钮文字变为"已复制 ✓"，2秒后恢复
   - 错误处理（权限拒绝等）

**验证**: 所有工具的复制按钮均能正确写入剪贴板

### Step 10: URL 工具 (W10)

**目标**: URL 编解码 Service + UI

**操作**:
1. 创建 `src/services/urlService.ts`:
   - `urlEncode(input, mode)` - 支持 component/uri 两种模式
   - `urlDecode(input)` - URL 解码
2. 创建 `UrlTool` 组件:
   - 输入区 + 模式切换 + 编码/解码按钮 + 输出区 + 复制按钮

**验证**: 两种编码模式结果正确

### Step 11: 颜色工具 (W11)

**目标**: 颜色格式转换 Service + UI + 颜色选择器

**操作**:
1. 创建 `src/services/colorService.ts`:
   - `colorConvert(input, fromFormat)` - HEX/RGB/HSL 互转
2. 创建 `ColorTool` 组件:
   - 颜色值输入 + 格式选择
   - 原生颜色选择器 `<input type="color">`
   - 三种格式值显示 + 各自复制按钮
   - 颜色预览块

**验证**: 三种格式互转正确，颜色选择器同步

### Step 12: 哈希工具 (W12)

**目标**: 哈希计算 Service + UI（Web Crypto API）

**操作**:
1. 创建 `src/services/hashService.ts`:
   - `hashCompute(input, algorithm)` - MD5(需第三方库)/SHA-1/SHA-256
   - SHA-1/SHA-256 使用 Web Crypto API
   - MD5 使用轻量库（如 `md5-js` 或自实现）
2. 创建 `HashTool` 组件:
   - 文本输入 + 算法选择（MD5/SHA-1/SHA-256/全部）
   - 哈希值显示 + 复制按钮

**验证**: 哈希值与标准工具一致

### Step 13: 历史记录 (W13)

**目标**: 历史记录 CRUD Service + 面板 UI + 自动淘汰

**操作**:
1. 创建 `src/services/historyService.ts`:
   - `saveHistoryItem(entry)` - 保存 + 自动淘汰
   - `getHistoryList(filter)` - 查询（倒序 + 过滤 + 分页）
   - `deleteHistoryItem(id)` - 删除单条
   - `clearHistory()` - 清空
   - `pruneHistory()` - LRU 淘汰
2. 创建 `HistoryPanel` 组件:
   - 历史记录列表（工具类型 + 操作摘要 + 时间）
   - 点击条目自动填充对应工具
   - 删除单条 + 清空全部
3. 每次工具操作后自动保存历史记录
4. 输入截断存储（> 10KB 截断）

**验证**: 历史记录保存/查询/删除/清空/自动淘汰均正确

### Step 14: 性能优化 (W14)

**目标**: Web Worker 大文本处理，输入节流，懒加载

**操作**:
1. 创建 Web Worker 用于 JSON 格式化等大文本操作
2. 输入 > 100KB 自动使用 Worker 异步处理
3. 输入 > 512KB 显示性能警告
4. 输入 > 1MB 拒绝处理
5. React.lazy 懒加载各工具组件
6. 输入框 onChange 300ms 节流

**验证**: 大文本不阻塞 UI

### Step 15: 测试完善 (W15)

**目标**: 单元测试 + 集成测试覆盖核心 Service

**操作**:
1. 配置 Vitest + jsdom 环境
2. 编写 Service 层单元测试（优先 P0）:
   - jsonService: TC-001-01~06, TC-011-01~07
   - base64Service: TC-004-01~05
   - timestampService: TC-002-01~06
   - cronService: TC-003-01~06
3. 编写集成测试:
   - historyService: TC-006-01~05
   - 主题持久化: TC-010-01~03
   - 工具状态持久化: TC-005-02
4. 编写存储层测试: TC-STO-01~06

**验证**: `npm run test` 全部通过

### Step 16: 安全审计 (W16)

**目标**: CSP 验证，权限审查，依赖安全

**操作**:
1. 验证 manifest.json CSP 配置正确
2. 确认仅申请 storage + sidePanel 权限
3. 运行 `npm audit`，修复 high/critical 漏洞
4. 验证无任何网络请求（除扩展更新外）
5. 验证 Excel 导出使用 Blob URL + 立即释放

**验证**: `npm audit` 无 high/critical

### Step 17: 打包发布 (W17)

**目标**: 生产构建，Edge Add-ons 提交准备

**操作**:
1. 配置生产构建 `npm run build`
2. 验证 dist 目录结构正确
3. 验证扩展可加载到 Edge
4. 验证安装包 < 2MB
5. 准备 Edge Add-ons 提交所需素材（图标、描述等）

**验证**: `npm run build` 成功，扩展可正常加载使用

---

## Assumptions & Decisions

| 决策项 | 选择 | 理由 |
|--------|------|------|
| 扩展架构 | Side Panel 优先 | 用户确认；如遇兼容问题再降级为 Popup |
| 状态管理 | Zustand + persist middleware | 规格文档 ADR-002 |
| Excel 生成 | ExcelJS | 规格文档 ADR-006，MIT 协议，浏览器端可用 |
| Cron 解析 | cronstrue + cron-parser | 规格文档 ADR-005 |
| MD5 计算 | 轻量库（blueimp-md5 或自实现） | Web Crypto API 不支持 MD5 |
| 主题方案 | CSS Custom Properties | 规格文档 ADR-004 |
| 测试框架 | Vitest + React Testing Library | 规格文档 SS3 |
| Side Panel 降级 | 如 API 不可用则切换为 Popup | 用户确认 |
| 实施范围 | S1-S4 完整实现 | 用户确认 |

## Verification Steps

1. **S1 验证**: 扩展可加载 → Side Panel 打开 → 导航切换 → 主题切换
2. **S2 验证**: JSON 格式化/压缩/校验/导出Excel → Base64 编解码 → 时间戳转换 → Cron 生成/解析 → 复制功能
3. **S3 验证**: URL 编解码 → 颜色转换 → 哈希计算 → 历史记录
4. **S4 验证**: `npm run lint` 通过 → `npm run typecheck` 通过 → `npm run test` 通过 → `npm run build` 成功 → `npm audit` 无高危
5. **性能验证**: 侧边栏打开 < 500ms，工具切换 < 200ms，JSON 格式化 1KB < 50ms
6. **安全验证**: 网络面板无出站请求，CSP 配置正确
