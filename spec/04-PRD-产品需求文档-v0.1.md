# 04 -- Product Requirements Document (DevToolKit Edge Extension)

---

| Item | Value |
|---|---|
| Module ID | DEVTOOL |
| Module Name | DevToolKit Edge Extension |
| Doc Version | v0.1 |
| Stage | Proposal (Why -> What transition) |
| Upstream | `03` Project Proposal (approved) |
| Downstream | -> `05` UserStory & Acceptance Criteria |

---

## 1. Vision & Goals

| 03 Pain Point | 04 Goal |
|---------------|---------|
| 开发调试时需频繁在多个在线工具网站间切换，效率低下 | 提供一站式集成工具箱，侧边栏常驻，工具间一键切换 |
| 现有在线工具将用户输入数据发送至服务器处理，存在代码/配置泄露风险 | 所有数据处理在本地完成，零网络传输，保障数据隐私 |
| Cron表达式语法复杂，手写易出错，缺乏可视化生成与校验工具 | 提供可视化Cron表达式生成器，支持自然语言解析与下次执行时间预览 |
| 缺乏集成化本地开发者工具箱，各工具分散，UI风格不统一 | 统一UI设计语言，一致的交互模式，降低学习成本 |
| 工具使用结果无法保存和回溯，重复操作频繁 | 提供本地历史记录，支持快速回溯与复用 |

## 2. Target Users

| Role | Usage Goal | Frequency |
|------|-----------|-----------|
| 前端开发者 | JSON格式化调试、颜色转换、URL编解码 | 每日5-10次 |
| 后端开发者 | 时间戳转换、Base64编解码、Cron表达式生成 | 每日3-8次 |
| DevOps工程师 | Cron表达式生成校验、Base64编解码、哈希计算 | 每日2-5次 |
| 测试工程师 | JSON校验、URL编解码、时间戳转换 | 每日2-4次 |

## 3. Core Business Scenarios

| ID | Scenario Name | User Journey |
|----|--------------|-------------|
| SC-01 | JSON格式化调试 | 打开侧边栏 -> 选择JSON工具 -> 粘贴JSON文本 -> 查看格式化结果 -> 一键复制 |
| SC-02 | 时间戳快速转换 | 打开侧边栏 -> 选择时间戳工具 -> 输入时间戳或选择日期 -> 查看转换结果 -> 复制目标格式 |
| SC-03 | Cron表达式生成 | 打开侧边栏 -> 选择Cron工具 -> 可视化配置各字段 -> 查看生成的表达式 -> 预览下次执行时间 -> 复制表达式 |
| SC-04 | Base64编解码 | 打开侧边栏 -> 选择Base64工具 -> 输入文本 -> 点击编码/解码 -> 查看结果 -> 复制 |
| SC-05 | 工具间快速切换 | 在任意工具中 -> 点击侧边栏导航 -> 切换到另一工具 -> 前一工具输入状态保留 |
| SC-06 | 历史记录回溯 | 点击历史记录按钮 -> 浏览历史列表 -> 选择历史条目 -> 自动填充输入与结果 -> 复制 |
| SC-07 | URL编解码 | 打开侧边栏 -> 选择URL工具 -> 输入URL文本 -> 点击编码/解码 -> 查看结果 -> 复制 |
| SC-08 | 颜色格式转换 | 打开侧边栏 -> 选择颜色工具 -> 输入HEX/RGB/HSL值 -> 查看其他格式 -> 复制目标格式 |
| SC-09 | 哈希计算 | 打开侧边栏 -> 选择哈希工具 -> 输入文本 -> 选择算法 -> 查看哈希值 -> 复制 |
| SC-10 | JSON转Excel导出 | 打开侧边栏 -> 选择JSON工具 -> 粘贴JSON数组 -> 点击"导出Excel" -> 选择工作表名 -> 下载.xlsx文件 |

## 4. Product Rules

| ID | Rule | Source |
|----|------|--------|
| R-01 | 所有数据处理MUST在本地完成，MUST NOT发送任何用户输入到远程服务器 | 03 SS1 隐私安全 |
| R-02 | 工具切换MUST保留当前工具的输入状态，用户返回时恢复 | 03 SS1 效率 |
| R-03 | 复制操作MUST提供视觉反馈（如按钮变为"已复制"） | 03 SS1 用户体验 |
| R-04 | JSON校验错误MUST高亮错误行号和位置 | S-01 需求记录 |
| R-05 | 时间戳工具MUST实时显示当前Unix时间戳 | S-03 用户访谈 |
| R-06 | Cron表达式MUST同时支持可视化生成和手动编辑，双向同步 | S-01 需求记录 |
| R-07 | 历史记录MUST按时间倒序排列，最多保留500条 | 03 SS4 成功标准 |
| R-08 | 输入超过大小限制时MUST显示警告提示 | 03 SS5 性能风险 |
| R-09 | 插件MUST支持深色/浅色主题切换 | S-02 用户体验问题 |
| R-10 | 侧边栏MUST支持键盘快捷键操作 | S-03 用户访谈 |
| R-11 | JSON转Excel导出MUST在本地生成文件，MUST NOT将数据上传到任何服务器 | S-04 数据隐私 |
| R-12 | JSON转Excel仅支持JSON数组格式（Array of Object），非数组格式MUST提示用户 | S-04 需求约束 |
| R-13 | 导出的Excel文件MUST使用UTF-8编码，正确显示中文 | S-04 中文支持 |

## 5. Capabilities & Priorities

| Sub-capability | Priority | Related Scenario |
|---------------|----------|-----------------|
| JSON格式化（美化） | **P0** | SC-01 |
| JSON压缩（最小化） | **P0** | SC-01 |
| JSON语法校验与错误定位 | **P0** | SC-01 |
| JSON转Excel导出 | **P0** | SC-10 |
| Base64文本编码 | **P0** | SC-04 |
| Base64文本解码 | **P0** | SC-04 |
| Unix时间戳转日期 | **P0** | SC-02 |
| 日期转Unix时间戳 | **P0** | SC-02 |
| 实时当前时间戳显示 | **P0** | SC-02 |
| Cron表达式可视化生成 | **P0** | SC-03 |
| Cron表达式解析为自然语言 | **P0** | SC-03 |
| Cron下次执行时间预览 | **P0** | SC-03 |
| 侧边栏工具导航 | **P0** | SC-05 |
| 一键复制结果 | **P0** | SC-01~SC-10 |
| URL编码 | P1 | SC-07 |
| URL解码 | P1 | SC-07 |
| 颜色格式转换（HEX/RGB/HSL） | P1 | SC-08 |
| 哈希计算（MD5/SHA-1/SHA-256） | P1 | SC-09 |
| 本地历史记录 | P1 | SC-06 |
| 深色/浅色主题 | P1 | SC-01~SC-10 |
| 键盘快捷键 | P1 | SC-05 |

## 6. Acceptance & Success Criteria (PRD Level)

| Criterion | Measurement |
|-----------|------------|
| P0功能全部可用 | JSON/Base64/时间戳/Cron四大核心工具完整可用 |
| 本地零传输 | 通过网络面板验证，除插件更新外无任何出站请求 |
| 侧边栏交互流畅 | 打开 < 500ms，工具切换 < 200ms |
| 复制功能可靠 | 所有工具的复制按钮均能正确写入系统剪贴板 |

## 7. Relationship with 05 UserStory

| This Doc (PRD) | Role | Lands in 05 |
|----------------|------|------------|
| SS3 Core Scenarios | One narrative -> one or more US | SC-01 -> US-001, SC-02 -> US-002, SC-03 -> US-003, SC-04 -> US-004, SC-05 -> US-005, SC-06 -> US-006, SC-10 -> US-011 |
| SS4 Product Rules | Field/state/error specs | Split into each US's AC |
| SS5 Capability Priority | P0 / P1 | Aligned with US priority |

---

| Version | Date | Description |
|---------|------|------------|
| v0.1 | 2026-05-14 | Initial draft |
| v0.2 | 2026-05-14 | 新增JSON转Excel导出功能 (SC-10, R-11~R-13) |
