# 13 -- Test Strategy & Quality Gates (DevToolKit Edge Extension)

---

| Item | Value |
|---|---|
| Module ID | DEVTOOL |
| Module Name | DevToolKit Edge Extension |
| Doc Version | v0.1 |
| Stage | Test (Assertion - what counts as pass) |
| Trace Docs | `05` UserStory / `09` API Spec / `14` Trace |

---

## 1. Test Layers

| Layer | Tool | Coverage Target | Description |
|-------|------|----------------|------------|
| **L1 Unit** | Vitest | Service层纯函数、Utils工具函数 | 无DOM依赖，无chrome API依赖（mock） |
| **L2 Integration** | Vitest + jest-chrome | Service + chrome.storage集成 | Mock chrome.storage.local |
| **L3 Contract** | Vitest | Service接口返回值类型与`09`定义一致 | 字段名/类型验证 |
| **L4 E2E** | Playwright (Chromium) | 完整用户旅程 | 加载扩展，模拟用户操作 |

## 2. Test Case Splitting Principle

> **Core idea: count "independently-failing points"** -- each TC answers one question.

| Source | Counting Method | Example |
|--------|----------------|---------|
| Happy path | 每个Service函数的成功路径 = 1 TC | `jsonFormat('{"a":1}') -> success` = TC-001-01 |
| Error codes | 每个独立error.code = 1 TC | `INVALID_JSON` = TC-001-03 |
| Branch paths | 每个if/else分支 = 1 TC | 毫秒级时间戳自动识别 = TC-002-02 |
| Type constraints | `09`字段类型断言 = 1 TC | `stats.keys` must be number = TC-001-01 |
| UI交互 | 每个用户操作 = 1 TC | 复制按钮点击 = TC-001-04 |

## 3. Test Cases

### 3.1 JSON Tool Tests

| TC-ID | Layer | Test Function | Assertion | Related REQ | Priority |
|-------|-------|--------------|-----------|-------------|----------|
| TC-001-01 | Unit | test_json_format_success | 返回formatted字符串，stats.keys为number | REQ-DEVTOOL-001 | P0 |
| TC-001-02 | Unit | test_json_minify_success | 返回压缩字符串，stats.reduction包含百分号 | REQ-DEVTOOL-001 | P0 |
| TC-001-03 | Unit | test_json_validate_invalid | 返回valid=false，errors数组非空，包含line/column | REQ-DEVTOOL-001 | P0 |
| TC-001-04 | Unit | test_json_validate_valid | 返回valid=true，errors数组为空 | REQ-DEVTOOL-001 | P0 |
| TC-001-05 | Unit | test_json_empty_input | 返回error.code = EMPTY_INPUT | REQ-DEVTOOL-001 | P0 |
| TC-001-06 | Unit | test_json_input_too_large | 返回error.code = INPUT_TOO_LARGE | REQ-DEVTOOL-001 | P0 |
| TC-001-07 | E2E | test_json_format_copy | 格式化后点击复制，剪贴板包含格式化结果 | REQ-DEVTOOL-001 | P0 |

### 3.2 Timestamp Tool Tests

| TC-ID | Layer | Test Function | Assertion | Related REQ | Priority |
|-------|-------|--------------|-----------|-------------|----------|
| TC-002-01 | Unit | test_timestamp_convert_seconds | 秒级时间戳转换，返回local/utc/relative字段 | REQ-DEVTOOL-002 | P0 |
| TC-002-02 | Unit | test_timestamp_convert_millis | 毫秒级时间戳自动识别并正确转换 | REQ-DEVTOOL-002 | P0 |
| TC-002-03 | Unit | test_date_to_timestamp | 日期字符串转换，返回unixSeconds和unixMillis | REQ-DEVTOOL-002 | P0 |
| TC-002-04 | Unit | test_current_timestamp | 返回unixSeconds/unixMillis/iso8601，值在合理范围内 | REQ-DEVTOOL-002 | P0 |
| TC-002-05 | Unit | test_timestamp_timezone | 指定timezone参数，返回对应时区时间 | REQ-DEVTOOL-002 | P0 |
| TC-002-06 | Unit | test_invalid_timestamp | 返回error.code = INVALID_TIMESTAMP | REQ-DEVTOOL-002 | P0 |
| TC-002-07 | E2E | test_timestamp_realtime_display | 页面显示实时时间戳，1秒后值更新 | REQ-DEVTOOL-002 | P0 |

### 3.3 Cron Tool Tests

| TC-ID | Layer | Test Function | Assertion | Related REQ | Priority |
|-------|-------|--------------|-----------|-------------|----------|
| TC-003-01 | Unit | test_cron_generate | 配置字段生成表达式，返回expression和humanReadable | REQ-DEVTOOL-003 | P0 |
| TC-003-02 | Unit | test_cron_parse | 解析表达式，返回fields对象和humanReadable | REQ-DEVTOOL-003 | P0 |
| TC-003-03 | Unit | test_cron_next_runs | 返回nextRuns数组，长度等于count参数 | REQ-DEVTOOL-003 | P0 |
| TC-003-04 | Unit | test_cron_invalid_expression | 返回error.code = INVALID_CRON_EXPRESSION | REQ-DEVTOOL-003 | P0 |
| TC-003-05 | Unit | test_cron_preset_presets | 预设表达式正确生成 | REQ-DEVTOOL-003 | P0 |
| TC-003-06 | Unit | test_cron_bidirectional_sync | 手动编辑表达式后字段选择器同步更新 | REQ-DEVTOOL-003 | P0 |
| TC-003-07 | E2E | test_cron_copy_expression | 生成后点击复制，剪贴板包含Cron表达式 | REQ-DEVTOOL-003 | P0 |

### 3.4 Base64 Tool Tests

| TC-ID | Layer | Test Function | Assertion | Related REQ | Priority |
|-------|-------|--------------|-----------|-------------|----------|
| TC-004-01 | Unit | test_base64_encode | 编码返回正确Base64字符串 | REQ-DEVTOOL-004 | P0 |
| TC-004-02 | Unit | test_base64_decode | 解码返回原始文本 | REQ-DEVTOOL-004 | P0 |
| TC-004-03 | Unit | test_base64_encode_utf8 | 中文字符编码解码往返一致 | REQ-DEVTOOL-004 | P0 |
| TC-004-04 | Unit | test_base64_invalid_input | 返回error.code = INVALID_BASE64 | REQ-DEVTOOL-004 | P0 |
| TC-004-05 | Unit | test_base64_empty_input | 返回error.code = EMPTY_INPUT | REQ-DEVTOOL-004 | P0 |

### 3.5 Navigation & Switching Tests

| TC-ID | Layer | Test Function | Assertion | Related REQ | Priority |
|-------|-------|--------------|-----------|-------------|----------|
| TC-005-01 | E2E | test_tool_navigation | 点击导航切换工具，当前工具高亮 | REQ-DEVTOOL-005 | P0 |
| TC-005-02 | Integration | test_tool_state_persistence | 切换工具后返回，输入内容保留 | REQ-DEVTOOL-005 | P0 |
| TC-005-03 | E2E | test_tool_switch_performance | 工具切换完成时间 < 200ms | REQ-DEVTOOL-005 | P0 |
| TC-005-04 | E2E | test_keyboard_shortcut | Ctrl+数字键切换到对应工具 | REQ-DEVTOOL-005 | P0 |

### 3.6 History Tests

| TC-ID | Layer | Test Function | Assertion | Related REQ | Priority |
|-------|-------|--------------|-----------|-------------|----------|
| TC-006-01 | Integration | test_history_save | 保存记录后列表包含新条目 | REQ-DEVTOOL-006 | P1 |
| TC-006-02 | Integration | test_history_list | 返回按时间倒序的列表，支持过滤 | REQ-DEVTOOL-006 | P1 |
| TC-006-03 | Integration | test_history_delete | 删除后列表不包含该条目 | REQ-DEVTOOL-006 | P1 |
| TC-006-04 | Integration | test_history_clear | 清空后列表为空 | REQ-DEVTOOL-006 | P1 |
| TC-006-05 | Integration | test_history_prune | 超过500条时自动淘汰最旧记录 | REQ-DEVTOOL-006 | P1 |
| TC-006-06 | E2E | test_history_click_fill | 点击历史条目自动填充对应工具 | REQ-DEVTOOL-006 | P1 |

### 3.7 URL Tool Tests

| TC-ID | Layer | Test Function | Assertion | Related REQ | Priority |
|-------|-------|--------------|-----------|-------------|----------|
| TC-007-01 | Unit | test_url_encode_component | encodeURIComponent模式编码 | REQ-DEVTOOL-007 | P1 |
| TC-007-02 | Unit | test_url_encode_uri | encodeURI模式编码 | REQ-DEVTOOL-007 | P1 |
| TC-007-03 | Unit | test_url_decode | 解码返回原始文本 | REQ-DEVTOOL-007 | P1 |
| TC-007-04 | Unit | test_url_empty_input | 返回error.code = EMPTY_INPUT | REQ-DEVTOOL-007 | P1 |

### 3.8 Color Tool Tests

| TC-ID | Layer | Test Function | Assertion | Related REQ | Priority |
|-------|-------|--------------|-----------|-------------|----------|
| TC-008-01 | Unit | test_color_hex_to_rgb_hsl | HEX输入返回rgb和hsl字段 | REQ-DEVTOOL-008 | P1 |
| TC-008-02 | Unit | test_color_rgb_to_hex_hsl | RGB输入返回hex和hsl字段 | REQ-DEVTOOL-008 | P1 |
| TC-008-03 | Unit | test_color_hsl_to_hex_rgb | HSL输入返回hex和rgb字段 | REQ-DEVTOOL-008 | P1 |
| TC-008-04 | Unit | test_color_invalid_format | 返回error.code = INVALID_COLOR_FORMAT | REQ-DEVTOOL-008 | P1 |

### 3.9 Hash Tool Tests

| TC-ID | Layer | Test Function | Assertion | Related REQ | Priority |
|-------|-------|--------------|-----------|-------------|----------|
| TC-009-01 | Unit | test_hash_md5 | MD5哈希值与预期一致 | REQ-DEVTOOL-009 | P1 |
| TC-009-02 | Unit | test_hash_sha1 | SHA-1哈希值与预期一致 | REQ-DEVTOOL-009 | P1 |
| TC-009-03 | Unit | test_hash_sha256 | SHA-256哈希值与预期一致 | REQ-DEVTOOL-009 | P1 |
| TC-009-04 | Unit | test_hash_all | algorithm="all"时返回全部哈希值 | REQ-DEVTOOL-009 | P1 |
| TC-009-05 | Unit | test_hash_unsupported_algorithm | 返回error.code = UNSUPPORTED_ALGORITHM | REQ-DEVTOOL-009 | P1 |

### 3.10 Theme Tests

| TC-ID | Layer | Test Function | Assertion | Related REQ | Priority |
|-------|-------|--------------|-----------|-------------|----------|
| TC-010-01 | Integration | test_theme_toggle | 切换主题后CSS变量更新 | REQ-DEVTOOL-010 | P1 |
| TC-010-02 | Integration | test_theme_persistence | 重启扩展后主题设置保持 | REQ-DEVTOOL-010 | P1 |
| TC-010-03 | Integration | test_theme_system_default | 默认跟随系统主题 | REQ-DEVTOOL-010 | P1 |

### 3.11 Storage Layer Unit Tests

| TC-ID | Layer | Covered Method | Assertion | Priority |
|-------|-------|---------------|-----------|----------|
| TC-STO-01 | Unit | saveHistoryItem | 正确生成id和createdAt | P0 |
| TC-STO-02 | Unit | getHistoryList | 返回倒序列表，支持过滤和分页 | P0 |
| TC-STO-03 | Unit | pruneHistory | 超出maxHistoryItems时淘汰最旧记录 | P0 |
| TC-STO-04 | Unit | getPreferences | 首次调用返回默认值 | P1 |
| TC-STO-05 | Unit | updatePreferences | 合并更新后返回完整Preferences | P1 |
| TC-STO-06 | Unit | saveToolState | 状态持久化到chrome.storage | P0 |

## 4. Quality Gates

| Gate-ID | Condition | Blocks Merge |
|---------|----------|-------------|
| **G-LINT** | ESLint passes, 0 errors | **Yes** |
| **G-TYPE** | TypeScript编译通过，0 errors | **Yes** |
| **G-UNIT** | L1 Unit tests all green | **Yes** |
| **G-INT** | L2 Integration tests all green | **Yes** |
| **G-CONTRACT** | L3 Contract tests all green | **Yes** |
| **G-E2E** | L4 E2E tests all green (P0 only) | **Yes** |
| **G-AC** | P0 acceptance criteria all covered by TC | **Yes** |
| **G-PERF** | 侧边栏打开 < 500ms, 工具切换 < 200ms | No (warning) |
| **G-SEC** | npm audit无high/critical漏洞 | **Yes** |

### Execution Commands

```bash
npm run lint           # ESLint check
npm run typecheck      # TypeScript compilation
npm run test           # Unit + Integration tests
npm run test:e2e       # E2E tests (Playwright)
npm run test:contract  # Contract tests
npm run build          # Production build
npm audit              # Security audit
```

## 5. TDD Applicability

| Scenario | TDD Value | Recommendation |
|----------|----------|---------------|
| Service层纯函数（JSON/Base64/URL编解码） | **High** | **Strongly suggest TDD** - 输入输出明确，易于测试 |
| 参数验证 / error.code | **High** | **Strongly suggest TDD** - 每个error.code一个TC |
| Cron表达式解析 | **High** | **Strongly suggest TDD** - 语法规则复杂，需覆盖多种模式 |
| UI组件渲染 | Medium | Write tests after - 组件逻辑相对简单 |
| chrome.storage集成 | Medium | Write tests after - 依赖mock |
| 主题切换 | Low | Write tests after - CSS变量切换，视觉验证为主 |

## 6. Traceability

| REQ ID | Implemented TC | To-be-added TC |
|--------|---------------|----------------|
| REQ-DEVTOOL-001 | TC-001-01~07 | -- |
| REQ-DEVTOOL-002 | TC-002-01~07 | -- |
| REQ-DEVTOOL-003 | TC-003-01~07 | -- |
| REQ-DEVTOOL-004 | TC-004-01~05 | -- |
| REQ-DEVTOOL-005 | TC-005-01~04 | -- |
| REQ-DEVTOOL-006 | TC-006-01~06 | -- |
| REQ-DEVTOOL-007 | TC-007-01~04 | -- |
| REQ-DEVTOOL-008 | TC-008-01~04 | -- |
| REQ-DEVTOOL-009 | TC-009-01~05 | -- |
| REQ-DEVTOOL-010 | TC-010-01~03 | -- |

---

| Version | Date | Description |
|---------|------|------------|
| v0.1 | 2026-05-14 | Initial draft |
