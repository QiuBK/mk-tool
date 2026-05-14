# 03 -- Project Proposal & Scope (DevToolKit Edge Extension)

---

| Item | Value |
|---|---|
| Module ID | DEVTOOL |
| Module Name | DevToolKit Edge Extension |
| Doc Version | v0.1 |
| Stage | Proposal (Why) |
| Tech Stack | React 18 + TypeScript + Edge Extension Manifest V3 |
| Trace | -> After approval enter `04` PRD |

---

## 1. Background & Problems

| Pain Point | Source |
|------------|--------|
| 开发调试时需频繁在多个在线工具网站间切换，效率低下 | S-01 |
| 现有在线工具将用户输入数据发送至服务器处理，存在代码/配置泄露风险 | S-01, S-02 |
| Cron表达式语法复杂，手写易出错，缺乏可视化生成与校验工具 | S-01, S-02 |
| 缺乏集成化本地开发者工具箱，各工具分散，UI风格不统一 | S-02 |
| 工具使用结果无法保存和回溯，重复操作频繁 | S-01, S-03 |

## 2. Proposal Summary

> Deliver an integrated developer toolkit Edge browser extension within a sidebar panel for software developers, providing JSON formatting, JSON-to-Excel export, Base64 encoding/decoding, Unix timestamp conversion, Cron expression generation, URL encoding/decoding, color format conversion, and hash calculation — all processed locally with zero data transmission, supporting instant tool switching, one-click copy, and local history.

## 3. Scope Boundary

| In-Scope | Out-of-Scope |
|----------|--------------|
| JSON格式化/压缩/校验 | JSON Schema验证 |
| JSON转Excel导出 | Excel模板自定义 |
| Base64文本编解码 | Base64文件编解码（P2阶段） |
| Unix时间戳与日期互转（多时区） | NTP时间同步 |
| Cron表达式可视化生成与解析 | Cron表达式远程任务调度 |
| URL编解码 | URL路由匹配测试 |
| 颜色格式转换（HEX/RGB/HSL） | 颜色对比度检测（WCAG） |
| 哈希计算（MD5/SHA-1/SHA-256） | 文件完整性校验 |
| 工具间快速切换（侧边栏导航） | 跨设备同步 |
| 一键复制结果 | 云端剪贴板同步 |
| 本地历史记录 | 云端历史同步 |
| Edge浏览器侧边栏面板 | Firefox/Safari适配 |
| Manifest V3 | Manifest V2兼容 |

## 4. Success Criteria (Measurable)

| Criterion | Measurement |
|-----------|------------|
| 工具响应速度 | 所有本地转换操作 < 100ms（1KB输入） |
| 插件安装体积 | 初始安装包 < 2MB |
| 侧边栏打开速度 | 点击图标到面板可交互 < 500ms |
| 历史记录容量 | 本地存储至少保留最近500条记录 |
| 数据零传输 | 所有数据处理在本地完成，无任何网络请求（除插件更新外） |
| 工具切换速度 | 工具间切换 < 200ms，保留输入状态 |

## 5. Risks

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Manifest V3对侧边栏API的兼容性限制 | 高 - 可能影响核心交互模式 | 优先验证 `chrome.sidePanel` API在Edge中的可用性，准备popup方案作为降级 |
| 大文本输入时的性能问题 | 中 - JSON格式化等操作可能卡顿 | 实现Web Worker异步处理，设置输入大小上限提示 |
| Chrome Extension API在Edge中的差异 | 中 - 部分API行为可能不同 | 使用Edge Chromium内核兼容层，测试关键API |
| 本地存储容量限制 | 低 - 历史记录可能超出quota | 实现LRU淘汰策略，设置存储上限预警 |

## 6. Go / No-Go Prerequisites

- [ ] 验证 `chrome.sidePanel` API在Edge最新版中可用且稳定
- [ ] 确认Manifest V3对React SPA的支持方式
- [ ] 确认chrome.storage.local在Edge中的容量限制
- [ ] 确认Cron表达式解析库的许可证兼容性

---

| Version | Date | Description |
|---------|------|------------|
| v0.1 | 2026-05-14 | Initial draft |
| v0.2 | 2026-05-14 | 新增JSON转Excel导出范围 |
