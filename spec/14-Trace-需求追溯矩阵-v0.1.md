# 14 -- Requirements Traceability Matrix (DevToolKit Edge Extension)

---

| Item | Value |
|---|---|
| Module ID | DEVTOOL |
| Module Name | DevToolKit Edge Extension |
| Doc Version | v0.1 |
| Stage | Trace (Panoramic - 4-way traceability) |
| Trace Docs | `05` UserStory / `09` API Spec / `13` Test Strategy |

---

**REQ <-> UserStory <-> API Endpoint <-> Test Case**

## 1. Requirement Numbering System

| ID Format | Meaning | Example |
|-----------|---------|---------|
| `REQ-DEVTOOL-{NNN}` | Functional requirement | REQ-DEVTOOL-001 |
| `RULE-{NNN}` | Data/type constraint rule | RULE-001 |

| Level | Meaning | Gate Impact |
|-------|---------|-----------|
| **P0** | Must implement, blocks release | All related TCs green to merge |
| **P1** | Should implement, doesn't block v1 | CI warning |
| **P2** | Optional enhancement | Not in gate |

## 2. Requirement Definition Table

| REQ ID | Requirement Name | Priority | Source | Detail |
|--------|-----------------|----------|--------|--------|
| **REQ-DEVTOOL-001** | JSON格式化与校验 | P0 | `05` US-001 | JSON美化/压缩/校验，错误定位，复制 |
| **REQ-DEVTOOL-002** | Unix时间戳转换 | P0 | `05` US-002 | 时间戳与日期互转，实时显示，多时区 |
| **REQ-DEVTOOL-003** | Cron表达式生成器 | P0 | `05` US-003 | 可视化生成，自然语言解析，下次执行预览 |
| **REQ-DEVTOOL-004** | Base64编解码 | P0 | `05` US-004 | 文本Base64编解码，UTF-8支持 |
| **REQ-DEVTOOL-005** | 工具间快速切换 | P0 | `05` US-005 | 侧边栏导航，状态保留，快捷键 |
| **REQ-DEVTOOL-006** | 本地历史记录 | P1 | `05` US-006 | 历史CRUD，自动淘汰，点击回填 |
| **REQ-DEVTOOL-007** | URL编解码 | P1 | `05` US-007 | URL编码解码，component/uri模式 |
| **REQ-DEVTOOL-008** | 颜色格式转换 | P1 | `05` US-008 | HEX/RGB/HSL互转，颜色选择器 |
| **REQ-DEVTOOL-009** | 哈希计算 | P1 | `05` US-009 | MD5/SHA-1/SHA-256计算 |
| **REQ-DEVTOOL-010** | 深色/浅色主题 | P1 | `05` US-010 | 主题切换，跟随系统，持久化 |

## 3. Forward Traceability Matrix

> Reading direction: REQ -> UserStory -> API Endpoint -> Test Case

| REQ ID | UserStory / AC Source | API Endpoint | TC ID | Coverage Status |
|--------|----------------------|-------------|-------|----------------|
| **REQ-DEVTOOL-001** | US-001 / AC-001-01~05 | `jsonFormat`, `jsonMinify`, `jsonValidate` | TC-001-01~07 | ✅ Covered |
| **REQ-DEVTOOL-002** | US-002 / AC-002-01~06 | `timestampConvert`, `dateToTimestamp`, `getCurrentTimestamp` | TC-002-01~07 | ✅ Covered |
| **REQ-DEVTOOL-003** | US-003 / AC-003-01~07 | `cronGenerate`, `cronParse`, `cronNextRuns` | TC-003-01~07 | ✅ Covered |
| **REQ-DEVTOOL-004** | US-004 / AC-004-01~05 | `base64Encode`, `base64Decode` | TC-004-01~05 | ✅ Covered |
| **REQ-DEVTOOL-005** | US-005 / AC-005-01~05 | N/A (纯前端) | TC-005-01~04 | ✅ Covered |
| **REQ-DEVTOOL-006** | US-006 / AC-006-01~06 | `historyList`, `historySave`, `historyDelete`, `historyClear` | TC-006-01~06 | ✅ Covered |
| **REQ-DEVTOOL-007** | US-007 / AC-007-01~04 | `urlEncode`, `urlDecode` | TC-007-01~04 | ✅ Covered |
| **REQ-DEVTOOL-008** | US-008 / AC-008-01~05 | `colorConvert` | TC-008-01~04 | ✅ Covered |
| **REQ-DEVTOOL-009** | US-009 / AC-009-01~05 | `hashCompute` | TC-009-01~05 | ✅ Covered |
| **REQ-DEVTOOL-010** | US-010 / AC-010-01~03 | N/A (纯前端) | TC-010-01~03 | ✅ Covered |

## 4. Reverse Traceability Matrix

> Reading direction: each TC traces back to REQ.

| TC ID | Test Layer | Related REQ | Assertion |
|-------|-----------|------------|-----------|
| TC-001-01 | Unit | REQ-DEVTOOL-001 | jsonFormat返回formatted和stats |
| TC-001-02 | Unit | REQ-DEVTOOL-001 | jsonMinify返回压缩结果和reduction |
| TC-001-03 | Unit | REQ-DEVTOOL-001 | jsonValidate非法时返回errors |
| TC-001-04 | Unit | REQ-DEVTOOL-001 | jsonValidate合法时valid=true |
| TC-001-05 | Unit | REQ-DEVTOOL-001 | 空输入返回EMPTY_INPUT |
| TC-001-06 | Unit | REQ-DEVTOOL-001 | 超大输入返回INPUT_TOO_LARGE |
| TC-001-07 | E2E | REQ-DEVTOOL-001 | 复制按钮写入剪贴板 |
| TC-002-01 | Unit | REQ-DEVTOOL-002 | 秒级时间戳转换 |
| TC-002-02 | Unit | REQ-DEVTOOL-002 | 毫秒级时间戳自动识别 |
| TC-002-03 | Unit | REQ-DEVTOOL-002 | 日期转时间戳 |
| TC-002-04 | Unit | REQ-DEVTOOL-002 | 当前时间戳获取 |
| TC-002-05 | Unit | REQ-DEVTOOL-002 | 时区转换 |
| TC-002-06 | Unit | REQ-DEVTOOL-002 | 无效时间戳返回错误 |
| TC-002-07 | E2E | REQ-DEVTOOL-002 | 实时时间戳更新 |
| TC-003-01 | Unit | REQ-DEVTOOL-003 | Cron表达式生成 |
| TC-003-02 | Unit | REQ-DEVTOOL-003 | Cron表达式解析 |
| TC-003-03 | Unit | REQ-DEVTOOL-003 | 下次执行时间计算 |
| TC-003-04 | Unit | REQ-DEVTOOL-003 | 无效Cron表达式返回错误 |
| TC-003-05 | Unit | REQ-DEVTOOL-003 | 预设快捷选择 |
| TC-003-06 | Unit | REQ-DEVTOOL-003 | 双向同步 |
| TC-003-07 | E2E | REQ-DEVTOOL-003 | 复制Cron表达式 |
| TC-004-01 | Unit | REQ-DEVTOOL-004 | Base64编码 |
| TC-004-02 | Unit | REQ-DEVTOOL-004 | Base64解码 |
| TC-004-03 | Unit | REQ-DEVTOOL-004 | UTF-8中文编解码 |
| TC-004-04 | Unit | REQ-DEVTOOL-004 | 无效Base64返回错误 |
| TC-004-05 | Unit | REQ-DEVTOOL-004 | 空输入返回错误 |
| TC-005-01 | E2E | REQ-DEVTOOL-005 | 工具导航切换 |
| TC-005-02 | Integration | REQ-DEVTOOL-005 | 工具状态持久化 |
| TC-005-03 | E2E | REQ-DEVTOOL-005 | 切换性能 < 200ms |
| TC-005-04 | E2E | REQ-DEVTOOL-005 | 键盘快捷键 |
| TC-006-01 | Integration | REQ-DEVTOOL-006 | 保存历史记录 |
| TC-006-02 | Integration | REQ-DEVTOOL-006 | 历史列表查询 |
| TC-006-03 | Integration | REQ-DEVTOOL-006 | 删除历史记录 |
| TC-006-04 | Integration | REQ-DEVTOOL-006 | 清空历史记录 |
| TC-006-05 | Integration | REQ-DEVTOOL-006 | 自动淘汰 |
| TC-006-06 | E2E | REQ-DEVTOOL-006 | 点击回填 |
| TC-007-01 | Unit | REQ-DEVTOOL-007 | URL component编码 |
| TC-007-02 | Unit | REQ-DEVTOOL-007 | URL URI编码 |
| TC-007-03 | Unit | REQ-DEVTOOL-007 | URL解码 |
| TC-007-04 | Unit | REQ-DEVTOOL-007 | 空输入返回错误 |
| TC-008-01 | Unit | REQ-DEVTOOL-008 | HEX转RGB/HSL |
| TC-008-02 | Unit | REQ-DEVTOOL-008 | RGB转HEX/HSL |
| TC-008-03 | Unit | REQ-DEVTOOL-008 | HSL转HEX/RGB |
| TC-008-04 | Unit | REQ-DEVTOOL-008 | 无效颜色格式返回错误 |
| TC-009-01 | Unit | REQ-DEVTOOL-009 | MD5计算 |
| TC-009-02 | Unit | REQ-DEVTOOL-009 | SHA-1计算 |
| TC-009-03 | Unit | REQ-DEVTOOL-009 | SHA-256计算 |
| TC-009-04 | Unit | REQ-DEVTOOL-009 | 全部算法计算 |
| TC-009-05 | Unit | REQ-DEVTOOL-009 | 不支持的算法返回错误 |
| TC-010-01 | Integration | REQ-DEVTOOL-010 | 主题切换 |
| TC-010-02 | Integration | REQ-DEVTOOL-010 | 主题持久化 |
| TC-010-03 | Integration | REQ-DEVTOOL-010 | 跟随系统主题 |

## 5. API Endpoint -> Test Case Mapping

| # | API Endpoint | Category | Related TC IDs | Coverage Status |
|---|-------------|----------|---------------|----------------|
| 1 | `jsonFormat` | JSON | TC-001-01 | ✅ |
| 2 | `jsonMinify` | JSON | TC-001-02 | ✅ |
| 3 | `jsonValidate` | JSON | TC-001-03, TC-001-04 | ✅ |
| 4 | `base64Encode` | Base64 | TC-004-01, TC-004-03 | ✅ |
| 5 | `base64Decode` | Base64 | TC-004-02, TC-004-04 | ✅ |
| 6 | `timestampConvert` | Timestamp | TC-002-01, TC-002-02, TC-002-05 | ✅ |
| 7 | `dateToTimestamp` | Timestamp | TC-002-03 | ✅ |
| 8 | `getCurrentTimestamp` | Timestamp | TC-002-04, TC-002-07 | ✅ |
| 9 | `cronGenerate` | Cron | TC-003-01, TC-003-05 | ✅ |
| 10 | `cronParse` | Cron | TC-003-02, TC-003-06 | ✅ |
| 11 | `cronNextRuns` | Cron | TC-003-03 | ✅ |
| 12 | `urlEncode` | URL | TC-007-01, TC-007-02 | ✅ |
| 13 | `urlDecode` | URL | TC-007-03 | ✅ |
| 14 | `colorConvert` | Color | TC-008-01~03 | ✅ |
| 15 | `hashCompute` | Hash | TC-009-01~04 | ✅ |
| 16 | `historyList` | History | TC-006-02 | ✅ |
| 17 | `historySave` | History | TC-006-01 | ✅ |
| 18 | `historyDelete` | History | TC-006-03 | ✅ |
| 19 | `historyClear` | History | TC-006-04 | ✅ |

## 6. Coverage Analysis

| Dimension | Covered | Total | Coverage % |
|-----------|---------|-------|-----------|
| API Endpoints | 19 | 19 | 100% |
| REQ Items (P0) | 5 | 5 | 100% |
| REQ Items (P1) | 5 | 5 | 100% |
| REQ Items (All) | 10 | 10 | 100% |
| TC Count | 53 | 53 | 100% |
| Error Codes | 12 | 12 | 100% |

### Key Risks

| Risk Item | Severity | Description |
|-----------|----------|------------|
| E2E测试环境搭建 | 中 | Playwright加载Chrome Extension需要特殊配置 |
| Web Worker测试 | 低 | Web Worker中的逻辑需要单独的测试策略 |
| 主题视觉验证 | 低 | 主题切换的视觉效果难以自动化验证，需人工确认 |

---

| Version | Date | Description |
|---------|------|------------|
| v0.1 | 2026-05-14 | Initial draft |
