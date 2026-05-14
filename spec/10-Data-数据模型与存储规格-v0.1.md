# 10 -- Data Model & Storage Specification (DevToolKit Edge Extension)

> 10 defines **data entities, field constraints, storage engine** and Storage class methods.

---

| Item | Value |
|---|---|
| Module ID | DEVTOOL |
| Module Name | DevToolKit Edge Extension |
| Doc Version | v0.1 |
| Stage | Design (How - Data Modeling) |
| Upstream | `08` Architecture / `09` API Spec |
| Downstream | -> `13` Storage Tests / `14` Trace |

---

## 1. Conceptual Model

```
+------------------+       +------------------+
|   HistoryItem    |       |   Preferences    |
+------------------+       +------------------+
| id (PK)          |       | theme            |
| toolType         |       | defaultTimezone  |
| input            |       | defaultHashAlgo  |
| output           |       | historyEnabled   |
| createdAt        |       | maxHistoryItems  |
+------------------+       +------------------+

+------------------+
|   ToolState      |
+------------------+
| toolType (PK)    |
| inputValue       |
| outputValue      |
| scrollPosition   |
| updatedAt        |
+------------------+
```

> **Core Relationship**: HistoryItem和ToolState通过toolType关联。HistoryItem记录历史操作，ToolState保存当前工具状态。Preferences为全局单例配置。

## 2. Storage Engine

| Item | Description |
|------|------------|
| Engine | chrome.storage.local |
| Encoding | JSON serialization |
| Read/Write Mode | 异步读写（Promise-based） |
| Concurrency Safety | Chrome Extension API保证原子性 |
| File Layout | Key-value存储，3个顶层key |
| Quota | 默认5MB（可申请unlimitedStorage） |

## 3. Entity Definition - HistoryItem

| Field | Type | Required | Constraint | Description |
|-------|------|----------|-----------|------------|
| id | string | Yes | **PK**, UUID v4 | 记录唯一标识 |
| toolType | string | Yes | 枚举值: "json" \| "base64" \| "timestamp" \| "cron" \| "url" \| "color" \| "hash" | 工具类型 |
| input | string | Yes | 最大10KB（截断存储） | 输入内容摘要 |
| output | string | Yes | 最大10KB（截断存储） | 输出内容摘要 |
| createdAt | number | Yes | Unix时间戳（毫秒） | 创建时间 |

## 4. Entity Definition - Preferences

| Field | Type | Required | Constraint | Description |
|-------|------|----------|-----------|------------|
| theme | string | Yes | 枚举值: "light" \| "dark" \| "system" | 主题设置，默认"system" |
| defaultTimezone | string | Yes | IANA时区字符串 | 默认时区，默认"local" |
| defaultHashAlgo | string | Yes | 枚举值: "md5" \| "sha1" \| "sha256" \| "all" | 默认哈希算法，默认"sha256" |
| historyEnabled | boolean | Yes | 默认true | 是否启用历史记录 |
| maxHistoryItems | number | Yes | 50-500，默认500 | 最大历史记录条数 |

## 5. Entity Definition - ToolState

| Field | Type | Required | Constraint | Description |
|-------|------|----------|-----------|------------|
| toolType | string | Yes | **PK**, 枚举值同HistoryItem.toolType | 工具类型标识 |
| inputValue | string | No | 最大1MB | 当前输入值 |
| outputValue | string | No | 最大1MB | 当前输出值 |
| scrollPosition | number | No | >= 0 | 滚动位置 |
| updatedAt | number | Yes | Unix时间戳（毫秒） | 最后更新时间 |

## 6. Storage Method List

### 6.1 HistoryItem Management

| Method | Signature | Behavior | Related TC |
|--------|-----------|----------|-----------|
| saveHistoryItem | `(entry: Omit<HistoryItem, 'id' \| 'createdAt'>) => Promise<HistoryItem>` | 生成UUID和timestamp，追加到历史列表，超出maxHistoryItems时淘汰最旧记录 | TC-006-01 |
| getHistoryList | `(filter?: { toolType?: string; limit?: number; offset?: number }) => Promise<{ items: HistoryItem[]; total: number }>` | 按时间倒序返回历史记录，支持工具类型过滤和分页 | TC-006-02 |
| deleteHistoryItem | `(id: string) => Promise<void>` | 删除指定ID的历史记录，不存在时抛出HISTORY_NOT_FOUND | TC-006-03 |
| clearHistory | `() => Promise<void>` | 清空所有历史记录 | TC-006-04 |
| pruneHistory | `() => Promise<void>` | 当记录数超过maxHistoryItems时，删除最旧的记录 | TC-006-05 |

### 6.2 Preferences Management

| Method | Signature | Behavior | Related TC |
|--------|-----------|----------|-----------|
| getPreferences | `() => Promise<Preferences>` | 获取用户偏好，首次返回默认值 | TC-010-01 |
| updatePreferences | `(partial: Partial<Preferences>) => Promise<Preferences>` | 合并更新用户偏好 | TC-010-02 |

### 6.3 ToolState Management

| Method | Signature | Behavior | Related TC |
|--------|-----------|----------|-----------|
| getToolState | `(toolType: string) => Promise<ToolState \| null>` | 获取指定工具的状态 | TC-005-02 |
| saveToolState | `(toolType: string, state: Partial<ToolState>) => Promise<void>` | 保存工具状态（合并更新） | TC-005-02 |
| clearAllToolStates | `() => Promise<void>` | 清空所有工具状态 | TC-005-03 |

## 7. Key Business Logic

| Logic | Trigger Condition | Behavior |
|-------|-------------------|----------|
| 历史记录自动淘汰 | saveHistoryItem后记录数 > maxHistoryItems | 按createdAt升序删除最旧记录，直到数量 = maxHistoryItems |
| 输入截断存储 | HistoryItem.input/output > 10KB | 截断至10KB，末尾追加"...[truncated]" |
| 工具状态自动保存 | 工具输入/输出变更后300ms（节流） | 调用saveToolState持久化当前状态 |
| 主题偏好持久化 | 切换主题后立即 | 调用updatePreferences保存theme值 |
| 存储容量检查 | 每次写入操作前 | 检查chrome.storage.local使用量，接近quota时触发pruneHistory |

## 8. API Response DTO Overview

| API Interface | Core DTO Fields | Extra Injection |
|-------------|----------------|----------------|
| jsonFormat | formatted, stats.keys, stats.depth | timestamp |
| jsonMinify | formatted, stats.originalSize, stats.minifiedSize, stats.reduction | timestamp |
| jsonValidate | valid, errors[].line, errors[].column, errors[].message | timestamp |
| base64Encode | result | timestamp |
| base64Decode | result | timestamp |
| timestampConvert | unixSeconds, unixMillis, local, utc, relative | timestamp |
| getCurrentTimestamp | unixSeconds, unixMillis, iso8601 | timestamp |
| cronGenerate | expression, humanReadable | timestamp |
| cronParse | expression, humanReadable, fields | timestamp |
| cronNextRuns | nextRuns[] | timestamp |
| urlEncode | result | timestamp |
| urlDecode | result | timestamp |
| colorConvert | hex, rgb, hsl, preview | timestamp |
| hashCompute | md5, sha1, sha256 | timestamp |
| historyList | items[].id, items[].toolType, items[].input, items[].output, items[].createdAt, total | timestamp |

---

| Version | Date | Description |
|---------|------|------------|
| v0.1 | 2026-05-14 | Initial draft |
