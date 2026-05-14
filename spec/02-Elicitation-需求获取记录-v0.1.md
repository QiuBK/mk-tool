# 02 -- Requirements Elicitation Record (DevToolKit Edge Extension)

---

| Item | Value |
|---|---|
| Module ID | DEVTOOL |
| Module Name | DevToolKit Edge Extension |
| Version / Stage | v0.1 - Elicitation |
| Trace | -> Feeds into `03` Proposal -> `04` PRD |

---

## S-01 User Research - 开发者日常工具使用痛点调研

| Item | Content |
|---|---|
| Time | 2026-05-14T00:00:00Z |
| Location | 线上调研 |
| Attendees | 前端开发者、后端开发者、DevOps工程师 |

### Pain Point Record

| Pain Point | Priority | Owner |
|------------|----------|-------|
| 开发调试时需频繁在多个在线工具网站间切换（JSON格式化、Base64编解码、时间戳转换等），效率低下 | P0 | Product |
| 现有在线开发工具将用户输入数据发送至服务器处理，存在代码/配置泄露风险 | P0 | Security |
| Cron表达式语法复杂，手写易出错，缺乏可视化生成与校验工具 | P0 | Product |
| 缺乏集成化的本地开发者工具箱，各工具分散在不同网站，UI风格不统一 | P1 | Product |
| 工具使用结果无法保存和回溯，重复操作频繁 | P1 | Product |

### Requirement Record

1. **JSON工具**: 支持JSON格式化（美化）、压缩（最小化）、语法校验，实时高亮错误位置
2. **Base64编解码**: 支持文本与Base64互转，支持文件Base64编码
3. **Unix时间戳转换**: 支持时间戳与可读日期互转，支持多时区，实时显示当前时间戳
4. **Cron表达式生成器**: 可视化配置生成Cron表达式，支持表达式解析为自然语言，支持下次执行时间预览
5. **URL编解码**: 支持URL编码与解码，支持组件编码
6. **颜色格式转换**: 支持HEX/RGB/HSL互转，支持颜色选择器
7. **哈希计算**: 支持MD5/SHA-1/SHA-256计算
8. **快捷操作**: 工具间快速切换、一键复制结果、历史记录

### Next Steps

- [ ] 确认工具优先级与MVP范围 (Product, 2026-05-15)
- [ ] 确认Edge Extension Manifest V3技术约束 (Engineering, 2026-05-15)
- [ ] 确认本地存储策略与容量限制 (Engineering, 2026-05-16)

---

## S-02 Competitive Analysis - 现有开发者工具浏览器插件调研

| Item | Content |
|---|---|
| Source | Chrome Web Store / Edge Add-ons 市场调研 |
| Time | 2026-05-14T00:00:00Z |

**Issue 1 -- 功能分散问题:** 现有插件大多只提供单一功能（如仅JSON格式化或仅Base64编解码），开发者需安装多个插件，占用浏览器资源且管理不便。

**Issue 2 -- 隐私安全问题:** 部分在线工具和插件会将用户输入的数据发送到远程服务器进行处理，存在代码片段、API密钥、配置信息泄露风险。

**Issue 3 -- 用户体验问题:** 现有工具UI设计粗糙，缺乏统一的交互模式，复制操作不便捷，无历史记录功能。

**Issue 4 -- Cron表达式工具缺失:** 市场上缺乏好用的Cron表达式可视化生成器插件，现有工具多为独立网站，无法在浏览器侧边栏快速访问。

---

## S-03 User Interview - 后端开发者日常工具需求

| Item | Content |
|---|---|
| Interviewee | 张工 (后端开发工程师) |
| Interviewer | Product Team |
| Time | 2026-05-14T00:00:00Z |
| Method | 线上 |

| Question | Key Points |
|----------|-----------|
| Q1: 日常开发中最常用的工具类操作有哪些？ | JSON格式化排第一，其次是时间戳转换和Base64编解码，Cron表达式调试频率也很高 |
| Q2: 当前如何使用这些工具？ | 浏览器书签收藏了5-6个在线工具网站，来回切换很麻烦 |
| Q3: 对现有工具有什么不满？ | 在线工具有广告、加载慢、隐私担忧；本地工具需要额外安装 |
| Q4: 期望的交互方式是什么？ | 浏览器侧边栏常驻，快捷键唤起，输入即转换，一键复制 |
| Q5: 历史记录功能重要吗？ | 重要，经常需要回看之前转换过的内容，比如某个时间戳对应的日期 |

**Summary:** 后端开发者高频使用JSON/时间戳/Base64/Cron工具，期望浏览器侧边栏集成、输入即转换、一键复制、历史回溯的交互体验，且对数据隐私有明确要求。

---

| Version | Date | Description |
|---------|------|------------|
| v0.1 | 2026-05-14 | Initial draft |
