# 06 -- Functional Specification Document (DevToolKit Edge Extension)

> 06 translates `05` User Stories into **frontend-implementable UI behavior specs**. "Who wants what" is in 05; "how the UI behaves" is here.

---

| Item | Value |
|---|---|
| Module ID | DEVTOOL |
| Module Name | DevToolKit Edge Extension |
| Doc Version | v0.1 |
| Stage | Spec (What - UI/UX Behavior) |
| Upstream | `05` UserStory & AC |
| Downstream | -> `08` Architecture / `09` API / `13` E2E Test |

---

## 1. Page Layout Overview

```
+--------------------------------------------------+
|  DevToolKit                    [Theme] [History]  |
+--------+-----------------------------------------+
|        |                                         |
|  Nav   |         Tool Content Area               |
|        |                                         |
| [JSON] |  +-----------------------------------+  |
| [B64]  |  |  Input Area                       |  |
| [TS]   |  |  (textarea / input fields)        |  |
| [Cron] |  +-----------------------------------+  |
| [URL]  |  |  [Action Buttons]                 |  |
| [Color]|  +-----------------------------------+  |
| [Hash] |  |  Output Area                      |  |
|        |  |  (result display + copy button)   |  |
|        |  +-----------------------------------+  |
|        |                                         |
+--------+-----------------------------------------+
```

## 2. Navigation Sidebar - 工具导航

### 2.1 工具列表

| Condition | Display | Description |
|-----------|---------|------------|
| 默认状态 | 显示所有工具图标+名称 | JSON / Base64 / 时间戳 / Cron / URL / 颜色 / 哈希 |
| 当前选中工具 | 高亮背景+左侧指示条 | 标识当前活跃工具 |
| 鼠标悬停 | 轻微背景色变化 | 提供交互反馈 |

### 2.2 顶部操作栏

| Element | Type | Behavior |
|---------|------|----------|
| Theme Toggle | `<button>` | 切换深色/浅色主题，图标随主题变化（太阳/月亮） |
| History Button | `<button>` | 点击打开历史记录面板 |

## 3. JSON Tool - JSON工具交互

| Function | Trigger | API Call | Behavior |
|----------|---------|----------|----------|
| 格式化 | 点击"格式化"按钮 | `jsonFormat(input)` | 输出区域显示美化JSON，显示键数和嵌套深度统计 |
| 压缩 | 点击"压缩"按钮 | `jsonMinify(input)` | 输出区域显示最小化JSON，显示压缩率 |
| 校验 | 输入时实时 / 点击"校验"按钮 | `jsonValidate(input)` | 合法时显示绿色勾号；非法时高亮错误行，显示错误信息 |
| 复制 | 点击输出区域"复制"按钮 | `navigator.clipboard.writeText()` | 按钮文字变为"已复制 ✓"，2秒后恢复 |

### 3.1 Input Area

| Element | Type | Behavior |
|---------|------|----------|
| JSON输入框 | `<textarea>` | 支持多行输入，等宽字体，自动缩进，支持粘贴 |
| 输入大小提示 | `<span>` | 实时显示输入字节数，超过512KB显示警告色 |

### 3.2 Output Area States

| State | Condition | Display Content |
|-------|-----------|----------------|
| **A Empty** | 未输入内容 | 显示占位提示"在此粘贴JSON文本..." |
| **B Processing** | 正在格式化/压缩 | 显示加载动画（大文本时） |
| **C Success** | 处理成功 | 显示格式化/压缩结果 + 统计信息 + 复制按钮 |
| **D Error** | JSON校验失败 | 高亮错误行号 + 错误消息 + 错误位置标记 |

## 4. Timestamp Tool - 时间戳工具交互

| Function | Trigger | API Call | Behavior |
|----------|---------|----------|----------|
| 时间戳转日期 | 输入时间戳 | `timestampConvert(input)` | 显示本地时间、UTC时间、相对时间 |
| 日期转时间戳 | 选择日期时间 | `dateToTimestamp(input)` | 显示秒级和毫秒级时间戳 |
| 当前时间戳 | 页面加载 / 每秒自动 | `getCurrentTimestamp()` | 实时更新当前时间戳显示 |
| 复制 | 点击对应复制按钮 | `navigator.clipboard.writeText()` | 按钮文字变为"已复制 ✓" |

### 4.1 Input Area

| Element | Type | Behavior |
|---------|------|----------|
| 时间戳输入框 | `<input type="text">` | 支持秒级和毫秒级时间戳，自动识别 |
| 日期选择器 | `<input type="datetime-local">` | 选择日期时间 |
| 时区选择 | `<select>` | UTC / 本地 / 自定义IANA时区 |

### 4.2 Current Timestamp Display

| Element | Type | Behavior |
|---------|------|----------|
| 秒级时间戳 | `<code>` | 每秒更新，点击可复制 |
| 毫秒级时间戳 | `<code>` | 每秒更新，点击可复制 |
| ISO 8601 | `<code>` | 每秒更新，点击可复制 |

## 5. Cron Tool - Cron表达式工具交互

| Function | Trigger | API Call | Behavior |
|----------|---------|----------|----------|
| 生成表达式 | 修改任意字段选择器 | `cronGenerate(config)` | 实时更新Cron表达式和自然语言描述 |
| 解析表达式 | 手动编辑表达式输入框 | `cronParse(expression)` | 更新字段选择器和自然语言描述 |
| 预览执行时间 | 表达式变更 | `cronNextRuns(expression, 5)` | 显示接下来5次执行时间 |
| 预设选择 | 点击预设按钮 | 直接设置字段值 | 快速填充常见Cron模式 |
| 复制 | 点击复制按钮 | `navigator.clipboard.writeText()` | 复制Cron表达式 |

### 5.1 Cron Field Editors

| Field | Type | Behavior |
|-------|------|----------|
| 秒 | `<select>` + 自定义输入 | 支持 *, 具体值, 范围, 步长 |
| 分 | `<select>` + 自定义输入 | 支持 *, 具体值, 范围, 步长 |
| 时 | `<select>` + 自定义输入 | 支持 *, 具体值, 范围, 步长 |
| 日 | `<select>` + 自定义输入 | 支持 *, 具体值, 范围, 步长, ? |
| 月 | `<select>` + 自定义输入 | 支持 *, 具体值, 范围, 步长 |
| 周 | `<select>` + 自定义输入 | 支持 *, 具体值, 范围, 步长, ? |

### 5.2 Preset Quick Select

| Preset | Expression |
|--------|-----------|
| 每分钟 | `* * * * *` |
| 每小时 | `0 * * * *` |
| 每天0点 | `0 0 * * *` |
| 每周一9点 | `0 9 * * 1` |
| 每月1号0点 | `0 0 1 * *` |

## 6. Base64 Tool - Base64工具交互

| Function | Trigger | API Call | Behavior |
|----------|---------|----------|----------|
| 编码 | 点击"编码"按钮 | `base64Encode(input)` | 输出区域显示Base64编码结果 |
| 解码 | 点击"解码"按钮 | `base64Decode(input)` | 输出区域显示解码后文本 |
| 复制 | 点击复制按钮 | `navigator.clipboard.writeText()` | 按钮文字变为"已复制 ✓" |

## 7. URL Tool - URL工具交互

| Function | Trigger | API Call | Behavior |
|----------|---------|----------|----------|
| 编码 | 点击"编码"按钮 | `urlEncode(input, mode)` | 输出URL编码结果 |
| 解码 | 点击"解码"按钮 | `urlDecode(input)` | 输出URL解码结果 |
| 模式切换 | 切换encodeURI/encodeURIComponent | 更新mode参数 | 影响编码范围 |

## 8. Color Tool - 颜色工具交互

| Function | Trigger | API Call | Behavior |
|----------|---------|----------|----------|
| 转换 | 输入颜色值 | `colorConvert(input, fromFormat)` | 显示所有格式值 |
| 颜色选择 | 使用颜色选择器 | 更新输入值 | 同步更新所有格式 |
| 复制 | 点击对应格式复制按钮 | `navigator.clipboard.writeText()` | 复制目标格式值 |

## 9. Hash Tool - 哈希工具交互

| Function | Trigger | API Call | Behavior |
|----------|---------|----------|----------|
| 计算 | 输入文本 + 选择算法 | `hashCompute(input, algorithm)` | 显示哈希值 |
| 全部计算 | 点击"计算全部" | `hashCompute(input, "all")` | 同时显示MD5/SHA-1/SHA-256 |
| 复制 | 点击对应哈希值复制按钮 | `navigator.clipboard.writeText()` | 复制哈希值 |

## 10. History Panel - 历史记录面板

| Function | Trigger | API Call | Behavior |
|----------|---------|----------|----------|
| 加载列表 | 打开历史面板 | `historyList(filter)` | 显示历史记录列表 |
| 使用记录 | 点击历史条目 | 自动填充对应工具 | 跳转到对应工具并填充输入 |
| 删除记录 | 点击删除按钮 | `historyDelete(id)` | 从列表移除该条目 |
| 清空 | 点击"清空全部" | `historyClear()` | 清空所有历史记录 |

## 11. Error Handling

| error.code | Frontend Display |
|-----------|-----------------|
| `INVALID_JSON` | 输入区域下方红色提示："JSON语法错误：第{line}行第{column}列 - {message}" |
| `EMPTY_INPUT` | 对应按钮置灰，输入框下方灰色提示："请输入内容" |
| `INPUT_TOO_LARGE` | 输入框下方橙色警告："输入超过1MB限制，可能导致性能问题" |
| `INVALID_BASE64` | 输出区域红色提示："无效的Base64字符串" |
| `INVALID_TIMESTAMP` | 输入框下方红色提示："无效的时间戳格式" |
| `INVALID_DATE` | 输入框下方红色提示："无效的日期格式" |
| `INVALID_CRON_EXPRESSION` | 表达式输入框下方红色提示："无效的Cron表达式：{message}" |
| `INVALID_COLOR_FORMAT` | 输入框下方红色提示："无效的颜色格式" |
| `UNSUPPORTED_ALGORITHM` | 算法选择区域红色提示："不支持的哈希算法" |
| `STORAGE_QUOTA_EXCEEDED` | 全局Toast警告："本地存储空间不足，请清理历史记录" |

## 12. State Management

| State Variable | Type | Initial Value | Purpose |
|---------------|------|---------------|---------|
| activeTool | `ToolType` | `"json"` | 当前活跃工具标识 |
| toolStates | `Record<ToolType, ToolState>` | `{}` | 各工具的输入/输出状态持久化 |
| theme | `"light" \| "dark"` | 跟随系统 | 主题设置 |
| historyOpen | `boolean` | `false` | 历史面板开关状态 |
| clipboardFeedback | `string \| null` | `null` | 复制反馈提示（工具ID+字段） |

## 13. US -> FSD Alignment Table

| UserStory | Frontend-related ACs | This Doc Section |
|-----------|---------------------|-----------------|
| US-001 | AC-001-01~05 | SS3, SS3.1, SS3.2 |
| US-002 | AC-002-01~06 | SS4, SS4.1, SS4.2 |
| US-003 | AC-003-01~07 | SS5, SS5.1, SS5.2 |
| US-004 | AC-004-01~05 | SS6 |
| US-005 | AC-005-01~05 | SS2, SS12 |
| US-006 | AC-006-01~06 | SS10 |
| US-007 | AC-007-01~04 | SS7 |
| US-008 | AC-008-01~05 | SS8 |
| US-009 | AC-009-01~05 | SS9 |
| US-010 | AC-010-01~03 | SS2.2, SS12 |

---

| Version | Date | Description |
|---------|------|------------|
| v0.1 | 2026-05-14 | Initial draft |
