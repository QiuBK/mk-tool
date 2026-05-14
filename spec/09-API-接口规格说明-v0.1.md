# 09 -- API Interface Specification (DevToolKit Edge Extension)

---

| Item | Value |
|---|---|
| Module ID | DEVTOOL |
| Module Name | DevToolKit Edge Extension |
| Doc Version | v0.1 |
| Stage | Design (How - Contract Source of Truth) |
| Base URL | N/A (本地浏览器扩展，无HTTP服务) |

---

> This document is the **contract source of truth** for all internal service interfaces. `05` defines "what users want", **09 (this doc) defines "what the service layer must return"**, `13` test assertions are based on this doc.

> **注意**: 本项目为浏览器扩展，所有数据处理在本地完成。此处的"API"指扩展内部Service层与UI层之间的接口契约，通过TypeScript函数调用实现，非HTTP接口。

## 1. Interface Overview

| # | Interface | Category | Function | Return Type |
|---|-----------|----------|----------|-------------|
| 1 | `jsonFormat(input)` | JSON | JSON格式化（美化） | `JsonResult` |
| 2 | `jsonMinify(input)` | JSON | JSON压缩（最小化） | `JsonResult` |
| 3 | `jsonValidate(input)` | JSON | JSON语法校验 | `ValidationResult` |
| 4 | `base64Encode(input)` | Base64 | Base64编码 | `EncodeResult` |
| 5 | `base64Decode(input)` | Base64 | Base64解码 | `DecodeResult` |
| 6 | `timestampConvert(input)` | Timestamp | 时间戳转日期 | `TimestampResult` |
| 7 | `dateToTimestamp(input)` | Timestamp | 日期转时间戳 | `TimestampResult` |
| 8 | `getCurrentTimestamp()` | Timestamp | 获取当前时间戳 | `CurrentTimestampResult` |
| 9 | `cronGenerate(config)` | Cron | 可视化生成Cron表达式 | `CronResult` |
| 10 | `cronParse(expression)` | Cron | 解析Cron表达式 | `CronParseResult` |
| 11 | `cronNextRuns(expression, count)` | Cron | 计算下次执行时间 | `CronNextRunsResult` |
| 12 | `urlEncode(input, mode)` | URL | URL编码 | `EncodeResult` |
| 13 | `urlDecode(input)` | URL | URL解码 | `DecodeResult` |
| 14 | `colorConvert(input, fromFormat)` | Color | 颜色格式转换 | `ColorResult` |
| 15 | `hashCompute(input, algorithm)` | Hash | 哈希计算 | `HashResult` |
| 16 | `historyList(filter?)` | History | 获取历史记录列表 | `HistoryListResult` |
| 17 | `historySave(entry)` | History | 保存历史记录 | `void` |
| 18 | `historyDelete(id)` | History | 删除单条历史记录 | `void` |
| 19 | `historyClear()` | History | 清空所有历史记录 | `void` |

## 2. Unified Response Convention

### Success Response

```typescript
interface ServiceResult<T> {
  success: true;
  data: T;
  timestamp: number;
}
```

### Error Response

```typescript
interface ServiceError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  timestamp: number;
}
```

### Error Code List

| Category | error.code | Trigger Condition | details |
|----------|-----------|-------------------|---------|
| JSON | `INVALID_JSON` | JSON语法错误 | `{ line: number, column: number, message: string }` |
| JSON | `EMPTY_INPUT` | 输入为空字符串 | `null` |
| JSON | `INPUT_TOO_LARGE` | 输入超过1MB | `{ maxSize: string }` |
| Base64 | `INVALID_BASE64` | 非法Base64字符串 | `{ position: number }` |
| Base64 | `EMPTY_INPUT` | 输入为空字符串 | `null` |
| Timestamp | `INVALID_TIMESTAMP` | 时间戳格式无效 | `null` |
| Timestamp | `INVALID_DATE` | 日期格式无效 | `null` |
| Cron | `INVALID_CRON_EXPRESSION` | Cron表达式语法错误 | `{ field: string, message: string }` |
| Cron | `UNSUPPORTED_CRON_SYNTAX` | 不支持的Cron语法 | `{ syntax: string }` |
| URL | `EMPTY_INPUT` | 输入为空字符串 | `null` |
| Color | `INVALID_COLOR_FORMAT` | 颜色格式无效 | `{ format: string }` |
| Hash | `EMPTY_INPUT` | 输入为空字符串 | `null` |
| Hash | `UNSUPPORTED_ALGORITHM` | 不支持的哈希算法 | `{ algorithm: string }` |
| History | `HISTORY_NOT_FOUND` | 历史记录不存在 | `{ id: string }` |
| Storage | `STORAGE_QUOTA_EXCEEDED` | 存储空间不足 | `{ used: number, limit: number }` |

## 3. JSON Format - JSON格式化

**Input**:

| Field | Type | Required | Constraint | Description |
|-------|------|----------|-----------|------------|
| input | string | **Yes** | 非空，最大1MB | 待格式化的JSON字符串 |

**Success Response** (`ServiceResult<JsonResult>`):

| Field | Type | Required | Description |
|-------|------|----------|------------|
| data.formatted | string | Yes | 格式化后的JSON字符串（2空格缩进） |
| data.stats.keys | number | Yes | JSON键数量 |
| data.stats.depth | number | Yes | JSON最大嵌套深度 |

**Example Input**:

```json
{"name":"test","value":123}
```

**Example Output**:

```json
{
  "success": true,
  "data": {
    "formatted": "{\n  \"name\": \"test\",\n  \"value\": 123\n}",
    "stats": {
      "keys": 2,
      "depth": 1
    }
  },
  "timestamp": 1747180800000
}
```

## 4. JSON Minify - JSON压缩

**Input**:

| Field | Type | Required | Constraint | Description |
|-------|------|----------|-----------|------------|
| input | string | **Yes** | 非空，最大1MB | 待压缩的JSON字符串 |

**Success Response** (`ServiceResult<JsonResult>`):

| Field | Type | Required | Description |
|-------|------|----------|------------|
| data.formatted | string | Yes | 压缩后的JSON字符串 |
| data.stats.originalSize | number | Yes | 原始字节数 |
| data.stats.minifiedSize | number | Yes | 压缩后字节数 |
| data.stats.reduction | string | Yes | 压缩率百分比（如"45.2%"） |

## 5. JSON Validate - JSON校验

**Input**:

| Field | Type | Required | Constraint | Description |
|-------|------|----------|-----------|------------|
| input | string | **Yes** | 非空，最大1MB | 待校验的JSON字符串 |

**Success Response** (`ServiceResult<ValidationResult>`):

| Field | Type | Required | Description |
|-------|------|----------|------------|
| data.valid | boolean | Yes | 是否为合法JSON |
| data.errors | ValidationError[] | Yes | 错误列表（合法时为空） |

**ValidationError**:

| Field | Type | Description |
|-------|------|------------|
| line | number | 错误行号 |
| column | number | 错误列号 |
| message | string | 错误描述 |

**Example Input**:

```json
{"name": "test", "value":}
```

**Example Output**:

```json
{
  "success": true,
  "data": {
    "valid": false,
    "errors": [
      {
        "line": 1,
        "column": 24,
        "message": "Unexpected token }"
      }
    ]
  },
  "timestamp": 1747180800000
}
```

## 6. Base64 Encode - Base64编码

**Input**:

| Field | Type | Required | Constraint | Description |
|-------|------|----------|-----------|------------|
| input | string | **Yes** | 非空，最大1MB | 待编码的文本（UTF-8） |

**Success Response** (`ServiceResult<EncodeResult>`):

| Field | Type | Required | Description |
|-------|------|----------|------------|
| data.result | string | Yes | Base64编码结果 |

**Example Input**: `"Hello, 世界"`

**Example Output**:

```json
{
  "success": true,
  "data": {
    "result": "SGVsbG8sIOS4lueVjA=="
  },
  "timestamp": 1747180800000
}
```

## 7. Base64 Decode - Base64解码

**Input**:

| Field | Type | Required | Constraint | Description |
|-------|------|----------|-----------|------------|
| input | string | **Yes** | 合法Base64字符串 | 待解码的Base64字符串 |

**Success Response** (`ServiceResult<DecodeResult>`):

| Field | Type | Required | Description |
|-------|------|----------|------------|
| data.result | string | Yes | 解码后文本 |

## 8. Timestamp Convert - 时间戳转日期

**Input**:

| Field | Type | Required | Constraint | Description |
|-------|------|----------|-----------|------------|
| input | number | **Yes** | 合法Unix时间戳 | Unix时间戳（秒或毫秒） |
| timezone | string | No | 默认"local" | 目标时区（"utc"/"local"/IANA时区名） |

**Success Response** (`ServiceResult<TimestampResult>`):

| Field | Type | Required | Description |
|-------|------|----------|------------|
| data.unixSeconds | number | Yes | Unix时间戳（秒级） |
| data.unixMillis | number | Yes | Unix时间戳（毫秒级） |
| data.local | string | Yes | 本地时间（ISO 8601） |
| data.utc | string | Yes | UTC时间（ISO 8601） |
| data.relative | string | Yes | 相对时间描述（如"3分钟前"） |

## 9. Date To Timestamp - 日期转时间戳

**Input**:

| Field | Type | Required | Constraint | Description |
|-------|------|----------|-----------|------------|
| input | string | **Yes** | 合法日期字符串 | 日期时间字符串 |
| timezone | string | No | 默认"local" | 源时区 |

**Success Response**: 同 `TimestampResult`

## 10. Get Current Timestamp - 获取当前时间戳

**Input**: 无

**Success Response** (`ServiceResult<CurrentTimestampResult>`):

| Field | Type | Required | Description |
|-------|------|----------|------------|
| data.unixSeconds | number | Yes | 当前Unix时间戳（秒级） |
| data.unixMillis | number | Yes | 当前Unix时间戳（毫秒级） |
| data.iso8601 | string | Yes | 当前ISO 8601时间 |

## 11. Cron Generate - Cron表达式生成

**Input**:

| Field | Type | Required | Constraint | Description |
|-------|------|----------|-----------|------------|
| config.seconds | string | No | 默认"0"，Cron秒字段 | 秒配置 |
| config.minutes | string | **Yes** | Cron分字段 | 分配置 |
| config.hours | string | **Yes** | Cron时字段 | 时配置 |
| config.dayOfMonth | string | No | 默认"*"，Cron日字段 | 日配置 |
| config.month | string | No | 默认"*"，Cron月字段 | 月配置 |
| config.dayOfWeek | string | No | 默认"*"，Cron周字段 | 周配置 |

**Success Response** (`ServiceResult<CronResult>`):

| Field | Type | Required | Description |
|-------|------|----------|------------|
| data.expression | string | Yes | 生成的Cron表达式 |
| data.humanReadable | string | Yes | 自然语言描述 |

**Example Input**:

```json
{
  "seconds": "0",
  "minutes": "0",
  "hours": "9",
  "dayOfMonth": "*",
  "month": "*",
  "dayOfWeek": "1-5"
}
```

**Example Output**:

```json
{
  "success": true,
  "data": {
    "expression": "0 0 9 * * 1-5",
    "humanReadable": "每周一至周五上午9:00"
  },
  "timestamp": 1747180800000
}
```

## 12. Cron Parse - Cron表达式解析

**Input**:

| Field | Type | Required | Constraint | Description |
|-------|------|----------|-----------|------------|
| expression | string | **Yes** | 合法Cron表达式 | Cron表达式字符串 |

**Success Response** (`ServiceResult<CronParseResult>`):

| Field | Type | Required | Description |
|-------|------|----------|------------|
| data.expression | string | Yes | 原始Cron表达式 |
| data.humanReadable | string | Yes | 自然语言描述 |
| data.fields | CronFields | Yes | 各字段解析结果 |

**CronFields**:

| Field | Type | Description |
|-------|------|------------|
| seconds | string | 秒字段值 |
| minutes | string | 分字段值 |
| hours | string | 时字段值 |
| dayOfMonth | string | 日字段值 |
| month | string | 月字段值 |
| dayOfWeek | string | 周字段值 |

## 13. Cron Next Runs - 下次执行时间

**Input**:

| Field | Type | Required | Constraint | Description |
|-------|------|----------|-----------|------------|
| expression | string | **Yes** | 合法Cron表达式 | Cron表达式字符串 |
| count | number | No | 默认5，最大20 | 返回的执行时间数量 |
| fromTime | number | No | 默认当前时间 | 起始时间戳（毫秒） |

**Success Response** (`ServiceResult<CronNextRunsResult>`):

| Field | Type | Required | Description |
|-------|------|----------|------------|
| data.nextRuns | string[] | Yes | 下次执行时间列表（ISO 8601） |

## 14. URL Encode - URL编码

**Input**:

| Field | Type | Required | Constraint | Description |
|-------|------|----------|-----------|------------|
| input | string | **Yes** | 非空 | 待编码的URL文本 |
| mode | "component" \| "uri" | No | 默认"component" | 编码模式 |

**Success Response** (`ServiceResult<EncodeResult>`):

| Field | Type | Required | Description |
|-------|------|----------|------------|
| data.result | string | Yes | URL编码结果 |

## 15. URL Decode - URL解码

**Input**:

| Field | Type | Required | Constraint | Description |
|-------|------|----------|-----------|------------|
| input | string | **Yes** | 合法URL编码字符串 | 待解码的URL文本 |

**Success Response** (`ServiceResult<DecodeResult>`):

| Field | Type | Required | Description |
|-------|------|----------|------------|
| data.result | string | Yes | URL解码结果 |

## 16. Color Convert - 颜色格式转换

**Input**:

| Field | Type | Required | Constraint | Description |
|-------|------|----------|-----------|------------|
| input | string | **Yes** | 合法颜色值 | 颜色值字符串 |
| fromFormat | "hex" \| "rgb" \| "hsl" | **Yes** | 源格式 | 输入颜色格式 |

**Success Response** (`ServiceResult<ColorResult>`):

| Field | Type | Required | Description |
|-------|------|----------|------------|
| data.hex | string | Yes | HEX格式值（如"#FF5733"） |
| data.rgb | string | Yes | RGB格式值（如"rgb(255, 87, 51)"） |
| data.hsl | string | Yes | HSL格式值（如"hsl(11, 100%, 60%)"） |
| data.preview | string | Yes | 颜色预览CSS值 |

## 17. Hash Compute - 哈希计算

**Input**:

| Field | Type | Required | Constraint | Description |
|-------|------|----------|-----------|------------|
| input | string | **Yes** | 非空 | 待计算文本 |
| algorithm | "md5" \| "sha1" \| "sha256" \| "all" | **Yes** | 哈希算法 | 算法选择，"all"表示全部 |

**Success Response** (`ServiceResult<HashResult>`):

| Field | Type | Required | Description |
|-------|------|----------|------------|
| data.md5 | string | Conditional | MD5哈希值（algorithm为"md5"或"all"时） |
| data.sha1 | string | Conditional | SHA-1哈希值（algorithm为"sha1"或"all"时） |
| data.sha256 | string | Conditional | SHA-256哈希值（algorithm为"sha256"或"all"时） |

## 18. History List - 历史记录列表

**Input**:

| Field | Type | Required | Constraint | Description |
|-------|------|----------|-----------|------------|
| filter.toolType | string | No | 工具类型过滤 | 按工具类型筛选 |
| filter.limit | number | No | 默认50，最大100 | 返回数量 |
| filter.offset | number | No | 默认0 | 偏移量 |

**Success Response** (`ServiceResult<HistoryListResult>`):

| Field | Type | Required | Description |
|-------|------|----------|------------|
| data.items | HistoryItem[] | Yes | 历史记录列表 |
| data.total | number | Yes | 总记录数 |

**HistoryItem**:

| Field | Type | Description |
|-------|------|------------|
| id | string | 记录唯一ID |
| toolType | string | 工具类型标识 |
| input | string | 输入内容摘要 |
| output | string | 输出内容摘要 |
| createdAt | number | 创建时间戳（毫秒） |

## 19. History Save - 保存历史记录

**Input**:

| Field | Type | Required | Constraint | Description |
|-------|------|----------|-----------|------------|
| entry.toolType | string | **Yes** | 工具类型 | 工具标识 |
| entry.input | string | **Yes** | 非空 | 输入内容 |
| entry.output | string | **Yes** | 非空 | 输出内容 |

**Success Response**: `ServiceResult<void>`

## 20. History Delete - 删除历史记录

**Input**:

| Field | Type | Required | Constraint | Description |
|-------|------|----------|-----------|------------|
| id | string | **Yes** | 存在的记录ID | 历史记录ID |

**Success Response**: `ServiceResult<void>`

## 21. History Clear - 清空历史记录

**Input**: 无

**Success Response**: `ServiceResult<void>`

## N. Parameter Validation Rules Summary

| Interface | Field | Rule | Fail error.code |
|-----------|-------|------|----------------|
| jsonFormat | input | 非空字符串 | `EMPTY_INPUT` |
| jsonFormat | input | 最大1MB | `INPUT_TOO_LARGE` |
| jsonMinify | input | 非空字符串 | `EMPTY_INPUT` |
| jsonValidate | input | 非空字符串 | `EMPTY_INPUT` |
| base64Encode | input | 非空字符串 | `EMPTY_INPUT` |
| base64Decode | input | 合法Base64字符串 | `INVALID_BASE64` |
| timestampConvert | input | 合法数字 | `INVALID_TIMESTAMP` |
| dateToTimestamp | input | 合法日期字符串 | `INVALID_DATE` |
| cronGenerate | config.minutes | 非空 | `INVALID_CRON_EXPRESSION` |
| cronGenerate | config.hours | 非空 | `INVALID_CRON_EXPRESSION` |
| cronParse | expression | 合法Cron表达式 | `INVALID_CRON_EXPRESSION` |
| cronNextRuns | expression | 合法Cron表达式 | `INVALID_CRON_EXPRESSION` |
| cronNextRuns | count | 1-20 | `INVALID_CRON_EXPRESSION` |
| urlEncode | input | 非空字符串 | `EMPTY_INPUT` |
| urlDecode | input | 非空字符串 | `EMPTY_INPUT` |
| colorConvert | input | 合法颜色值 | `INVALID_COLOR_FORMAT` |
| hashCompute | input | 非空字符串 | `EMPTY_INPUT` |
| hashCompute | algorithm | 枚举值之一 | `UNSUPPORTED_ALGORITHM` |
| historyDelete | id | 存在的记录ID | `HISTORY_NOT_FOUND` |

---

| Version | Date | Description |
|---------|------|------------|
| v0.1 | 2026-05-14 | Initial draft |
