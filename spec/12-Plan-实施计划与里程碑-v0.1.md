# 12 -- Implementation Plan & Milestones (DevToolKit Edge Extension)

---

| Item | Value |
|---|---|
| Module ID | DEVTOOL |
| Module Name | DevToolKit Edge Extension |
| Doc Version | v0.1 |
| Stage | Plan (When & Who) |
| Upstream | `05` UserStory / `08` Architecture / `09` API / `10` Data |
| Downstream | -> `13` Test Strategy / `14` Trace |

---

> 12 answers two questions: (1) **S (Stages)**: What can be demonstrated when? (2) **W (WBS)**: How to break down engineering work?

## 1. Milestones (S1~S4)

| Stage | Deliverable (Demonstrable) | Satisfies REQ/US | Verifies TC |
|-------|---------------------------|------------------|------------|
| **S1** 基础框架 | 扩展可加载，Side Panel打开，导航框架可用，主题切换可用 | REQ-DEVTOOL-005, REQ-DEVTOOL-010 | TC-005, TC-010 |
| **S2** 核心工具 | JSON/Base64/时间戳/Cron四大核心工具完整可用，复制功能可用 | REQ-DEVTOOL-001~004 | TC-001~TC-004 |
| **S3** 扩展工具 | URL/颜色/哈希工具可用，历史记录功能可用 | REQ-DEVTOOL-006~009 | TC-006~TC-009 |
| **S4** 质量保障 | 所有测试通过，性能达标，安全审计完成，可发布 | 全部REQ | 全部TC |

## 2. WBS Task Breakdown

| Task ID | Task Name | Content | DoD (points to Spec) | Stage |
|---------|-----------|---------|---------------------|-------|
| W1 | 项目脚手架 | Vite + React + CRXJS项目初始化，manifest.json配置，Side Panel注册 | Aligns with `08` SS3 | S1 |
| W2 | 导航与布局 | 侧边栏导航组件，工具页面容器，响应式布局 | Aligns with `06` SS1-SS2 | S1 |
| W3 | 主题系统 | CSS Custom Properties主题变量，深色/浅色主题，持久化 | Aligns with `06` SS2.2, `07` SS6 | S1 |
| W4 | 状态管理 | Zustand store配置，工具状态持久化，chrome.storage集成 | Aligns with `08` SS3, `10` SS6.3 | S1 |
| W5 | JSON工具 | JSON格式化/压缩/校验/Excel导出Service + UI组件 | Aligns with `09` SS3-SS5.1, `06` SS3 | S2 |
| W6 | Base64工具 | Base64编解码Service + UI组件 | Aligns with `09` SS6-SS7, `06` SS6 | S2 |
| W7 | 时间戳工具 | 时间戳转换Service + UI组件 + 实时时间戳 | Aligns with `09` SS8-SS10, `06` SS4 | S2 |
| W8 | Cron工具 | Cron生成/解析/预览Service + UI组件 + 预设 | Aligns with `09` SS11-SS13, `06` SS5 | S2 |
| W9 | 复制功能 | 通用复制按钮组件，剪贴板写入，视觉反馈 | Aligns with `06` SS3-SS9 | S2 |
| W10 | URL工具 | URL编解码Service + UI组件 | Aligns with `09` SS14-SS15, `06` SS7 | S3 |
| W11 | 颜色工具 | 颜色转换Service + UI组件 + 颜色选择器 | Aligns with `09` SS16, `06` SS8 | S3 |
| W12 | 哈希工具 | 哈希计算Service + UI组件（Web Crypto API） | Aligns with `09` SS17, `06` SS9 | S3 |
| W13 | 历史记录 | 历史记录CRUD Service + 面板UI + 自动淘汰 | Aligns with `09` SS18-SS21, `06` SS10, `10` SS6.1 | S3 |
| W14 | 性能优化 | Web Worker大文本处理，输入节流，懒加载 | Aligns with `07` SS1 | S4 |
| W15 | 测试完善 | 单元测试、集成测试、E2E测试 | Aligns with `13` | S4 |
| W16 | 安全审计 | CSP验证，权限审查，npm audit | Aligns with `11` | S4 |
| W17 | 打包发布 | 生产构建，Edge Add-ons提交准备 | Aligns with `08` SS6 | S4 |

## 3. S x W Correspondence Matrix

> Legend: ** = primary, * = minor, -- = not involved

| WBS \ Stage | S1 | S2 | S3 | S4 |
|-------------|----|----|----|----|
| **W1** 项目脚手架 | ** | -- | -- | -- |
| **W2** 导航与布局 | ** | * | * | -- |
| **W3** 主题系统 | ** | -- | -- | -- |
| **W4** 状态管理 | ** | * | * | -- |
| **W5** JSON工具 | -- | ** | -- | -- |
| **W6** Base64工具 | -- | ** | -- | -- |
| **W7** 时间戳工具 | -- | ** | -- | -- |
| **W8** Cron工具 | -- | ** | -- | -- |
| **W9** 复制功能 | -- | ** | * | -- |
| **W10** URL工具 | -- | -- | ** | -- |
| **W11** 颜色工具 | -- | -- | ** | -- |
| **W12** 哈希工具 | -- | -- | ** | -- |
| **W13** 历史记录 | -- | -- | ** | -- |
| **W14** 性能优化 | -- | * | * | ** |
| **W15** 测试完善 | * | * | * | ** |
| **W16** 安全审计 | -- | -- | -- | ** |
| **W17** 打包发布 | -- | -- | -- | ** |

## 4. REQ -> S -> W -> TC Full Mapping

| REQ ID | User Perceives | Demo Stage | Primary WBS | Verify TC |
|--------|---------------|-----------|------------|----------|
| REQ-DEVTOOL-001 | JSON格式化与校验 | **S2** | W5 | TC-001 |
| REQ-DEVTOOL-011 | JSON转Excel导出 | **S2** | W5 | TC-011 |
| REQ-DEVTOOL-002 | Unix时间戳转换 | **S2** | W7 | TC-002 |
| REQ-DEVTOOL-003 | Cron表达式生成器 | **S2** | W8 | TC-003 |
| REQ-DEVTOOL-004 | Base64编解码 | **S2** | W6 | TC-004 |
| REQ-DEVTOOL-005 | 工具间快速切换 | **S1** | W2, W4 | TC-005 |
| REQ-DEVTOOL-006 | 本地历史记录 | **S3** | W13 | TC-006 |
| REQ-DEVTOOL-007 | URL编解码 | **S3** | W10 | TC-007 |
| REQ-DEVTOOL-008 | 颜色格式转换 | **S3** | W11 | TC-008 |
| REQ-DEVTOOL-009 | 哈希计算 | **S3** | W12 | TC-009 |
| REQ-DEVTOOL-010 | 深色/浅色主题 | **S1** | W3 | TC-010 |

## 5. Dependencies & Risks

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Side Panel API兼容性问题 | 高 - 核心交互模式受阻 | S1阶段优先验证，准备popup降级方案 |
| cronstrue库许可证或兼容性问题 | 中 - 影响Cron工具 | 提前验证MIT许可证，准备自研解析器备选 |
| Web Crypto API哈希计算异步处理 | 低 - 影响哈希工具实现 | 提前编写POC验证API可用性 |
| chrome.storage.local容量限制 | 低 - 历史记录可能受限 | 实现LRU淘汰，考虑申请unlimitedStorage权限 |

---

| Version | Date | Description |
|---------|------|------------|
| v0.1 | 2026-05-14 | Initial draft |
