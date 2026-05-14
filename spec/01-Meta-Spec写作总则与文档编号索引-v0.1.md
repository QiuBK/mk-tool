# 01 -- Spec写作总则与文档编号索引 (DevToolKit Edge Extension)

---

| Item | Value |
|---|---|
| Module ID | DEVTOOL |
| Module Name | DevToolKit Edge Extension |
| Doc Version | v0.1 |
| Stage | Meta Index |
| Generated | 2026-05-14 |

---

## 1. 文档编号索引

| 编号 | 文档名称 | 文件名 | 阶段 | 状态 |
|------|---------|--------|------|------|
| 01 | Spec写作总则与文档编号索引 | `01-Meta-Spec写作总则与文档编号索引-v0.1.md` | Meta | Draft |
| 02 | 需求获取记录 | `02-Elicitation-需求获取记录-v0.1.md` | R1: Origin | Draft |
| 03 | 项目提案与范围 | `03-Proposal-项目提案与范围-v0.1.md` | R1: Origin | Draft |
| 04 | 产品需求文档 | `04-PRD-产品需求文档-v0.1.md` | R1: Origin | Draft |
| 05 | 用户故事与验收标准 | `05-UserStory-用户故事与验收标准-v0.1.md` | R2: Anchor | Draft |
| 06 | 功能规格文档 | `06-FSD-功能规格文档-v0.1.md` | R3: Expand | Draft |
| 07 | 非功能需求与约束 | `07-NFR-非功能需求与约束-v0.1.md` | R3: Expand | Draft |
| 08 | 系统架构与技术选型 | `08-Architecture-系统架构与技术选型-v0.1.md` | R3: Expand | Draft |
| 09 | API接口规格说明 | `09-API-接口规格说明-v0.1.md` | R2: Anchor | Draft |
| 10 | 数据模型与存储规格 | `10-Data-数据模型与存储规格-v0.1.md` | R3: Expand | Draft |
| 11 | 安全设计规格 | `11-Security-安全设计规格-v0.1.md` | R4: Closure | Draft |
| 12 | 实施计划与里程碑 | `12-Plan-实施计划与里程碑-v0.1.md` | R4: Closure | Draft |
| 13 | 测试策略与质量门禁 | `13-Test-测试策略与质量门禁-v0.1.md` | R4: Closure | Draft |
| 14 | 需求追溯矩阵 | `14-Trace-需求追溯矩阵-v0.1.md` | R4: Closure | Draft |

## 2. 螺旋写作轮次

| Round | 文档 | 主题 | 清晰度目标 |
|-------|------|------|-----------|
| R1: Origin | 02 + 03 + 04 | 项目起源与提案 | 30% |
| R2: Anchor | 05 + 09 | 用户故事锚定 + API契约 | 60% |
| R3: Expand | 06 + 07 + 08 + 10 | 架构展开 + 数据建模 | 85% |
| R4: Closure | 11 + 12 + 13 + 14 | 安全闭环 + 测试闭环 + 追溯闭环 | 95% |

## 3. 术语表

| 术语 | 英文 | 定义 |
|------|------|------|
| Side Panel | Side Panel | Edge浏览器侧边栏面板，扩展的持久化UI容器 |
| Manifest V3 | Manifest V3 | Chrome/Edge扩展的最新清单版本，要求Service Worker替代Background Page |
| Service Worker | Service Worker | Manifest V3中的后台脚本，管理扩展生命周期 |
| CRXJS | @crxjs/vite-plugin | Vite的Chrome Extension开发插件，支持HMR |
| Zustand | Zustand | 轻量级React状态管理库 |
| cronstrue | cronstrue | Cron表达式转自然语言的JavaScript库 |
| Web Worker | Web Worker | 浏览器后台线程，用于大文本异步处理 |
| CSP | Content Security Policy | 内容安全策略，限制脚本执行来源 |
| LRU | Least Recently Used | 最近最少使用淘汰策略 |
| AC | Acceptance Criteria | 验收标准 |
| TC | Test Case | 测试用例 |
| REQ | Requirement | 需求项 |
| US | User Story | 用户故事 |
| FSD | Functional Specification Document | 功能规格文档 |
| NFR | Non-Functional Requirements | 非功能需求 |
| ADR | Architecture Decision Record | 架构决策记录 |
| SLO | Service Level Objective | 服务水平目标 |
| DoD | Definition of Done | 完成定义 |
| WBS | Work Breakdown Structure | 工作分解结构 |

## 4. 文档依赖关系

```
02 (Elicitation)
 |
 v
03 (Proposal) ---> 04 (PRD)
 |                  |
 v                  v
05 (UserStory) <--+-- 09 (API)
 |                  |
 +--+---+---+---+--+
    |   |   |   |
    v   v   v   v
   06  07  08  10
   |   |   |   |
   +---+---+---+
       |
       v
  11 + 12 + 13 + 14
```

## 5. 写作规则

- RFC关键词: **MUST**, **SHOULD**, **MAY**, **MUST NOT**
- 时间格式: ISO-8601 UTC
- API字段名在 `09` 中冻结，其他文档仅引用
- 业务规则链接到 `REQ-ID` + `UserStory-ID`
- AC映射到 `TC-ID`
- 跨模块依赖: type / impact / rollback

## 6. 命名规范

格式: `{编号}-{分类英文}-{中文主题}-v{主}.{次}.md`

分类词汇: Elicitation, Proposal, PRD, UserStory, FSD, NFR, Architecture, API, Data, Security, Plan, Test, Trace

---

| Version | Date | Description |
|---------|------|------------|
| v0.1 | 2026-05-14 | Initial draft |
