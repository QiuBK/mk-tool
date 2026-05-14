# 07 -- Non-Functional Requirements & Constraints (DevToolKit Edge Extension)

> 07 defines the module's **non-functional constraint baselines**: performance, availability, security, observability, maintainability.

---

| Item | Value |
|---|---|
| Module ID | DEVTOOL |
| Module Name | DevToolKit Edge Extension |
| Doc Version | v0.1 |
| Stage | Spec (What - Constraint Baselines) |
| Upstream | `03` SS5 Risks / `04` SS4 Rules / `05` ACs |
| Downstream | -> `08` Architecture / `09` API / `13` SLO Tests |

---

## 1. Performance Requirements

### 1.1 Latency SLO

| Metric | Target | Measurement | Source |
|--------|--------|-------------|--------|
| JSON格式化（1KB输入） | < 50ms | 输入提交到结果渲染 | 03 SS4 |
| JSON格式化（100KB输入） | < 200ms | 输入提交到结果渲染 | 03 SS4 |
| Base64编解码 | < 10ms | 输入提交到结果渲染 | 03 SS4 |
| 时间戳转换 | < 5ms | 输入提交到结果渲染 | 03 SS4 |
| Cron表达式生成/解析 | < 20ms | 输入提交到结果渲染 | 03 SS4 |
| 工具切换 | < 200ms | 点击导航到新工具可交互 | 04 R-02 |
| 侧边栏打开 | < 500ms | 点击图标到面板可交互 | 03 SS4 |
| 历史记录加载 | < 100ms | 打开面板到列表渲染完成 | 04 SC-06 |
| 哈希计算（1KB输入） | < 50ms | 输入提交到结果渲染 | 03 SS4 |
| JSON转Excel导出（100条记录） | < 500ms | 点击导出到文件下载触发 | 04 SC-10 |
| JSON转Excel导出（10000条记录） | < 3s | 点击导出到文件下载触发 | 04 SC-10 |

### 1.2 Degradation Strategy

```
正常响应 (< 100ms)
    |
    v
输入 > 100KB: 显示处理中动画，异步计算
    |
    v
输入 > 512KB: 显示性能警告，建议减小输入
    |
    v
输入 > 1MB: 拒绝处理，提示INPUT_TOO_LARGE
```

| Constraint | Description |
|-----------|------------|
| 输入大小上限 | 单次输入最大1MB，超出拒绝处理 |
| 大文本异步处理 | 输入 > 100KB时使用Web Worker异步处理，显示加载动画 |
| 实时转换节流 | 输入框onChange事件300ms节流，避免频繁计算 |

## 2. Availability Requirements

| Metric | Target | Description |
|--------|--------|------------|
| 插件可用性 | 99.9% | 除浏览器更新/崩溃外，插件始终可用 |
| 离线可用 | 100% | 所有功能在无网络环境下可用 |
| MTTR | < 5 min | 插件异常后通过重新打开侧边栏恢复 |

## 3. Observability Requirements

### 3.1 Trace

| Item | Specification |
|------|--------------|
| traceId Format | `dt_{timestamp}_{random}` |
| Injection Point | 每个Service层函数调用自动注入 |
| Upstream Passthrough | 不适用（无上游服务） |

### 3.2 Error Code System

| error.code | Trigger Condition |
|-----------|-------------------|
| `INVALID_JSON` | JSON语法错误 |
| `EMPTY_INPUT` | 输入为空 |
| `INPUT_TOO_LARGE` | 输入超过1MB |
| `INVALID_BASE64` | 非法Base64字符串 |
| `INVALID_TIMESTAMP` | 时间戳格式无效 |
| `INVALID_DATE` | 日期格式无效 |
| `INVALID_CRON_EXPRESSION` | Cron表达式语法错误 |
| `UNSUPPORTED_CRON_SYNTAX` | 不支持的Cron语法 |
| `NOT_JSON_ARRAY` | JSON不是数组格式 |
| `EXPORT_FAILED` | Excel导出失败 |
| `INVALID_COLOR_FORMAT` | 颜色格式无效 |
| `UNSUPPORTED_ALGORITHM` | 不支持的哈希算法 |
| `HISTORY_NOT_FOUND` | 历史记录不存在 |
| `STORAGE_QUOTA_EXCEEDED` | 存储空间不足 |

## 4. Security Requirements

| Item | Current Implementation | Description |
|------|----------------------|------------|
| API Auth | 不适用 | 无远程API，纯本地处理 |
| CORS | 不适用 | 无网络请求 |
| Rate Limiting | 不适用 | 无网络请求 |
| 数据传输 | 零传输 | 所有数据在本地处理，不发送任何网络请求 |

### 4.1 Sensitive Data Protection

| Data Type | Protection Method |
|-----------|------------------|
| 用户输入文本 | 仅存储于chrome.storage.local，不离开浏览器 |
| 历史记录 | chrome.storage.local加密存储，可手动清除 |
| 主题偏好 | chrome.storage.local，非敏感数据 |

## 5. Data Constraints

### 5.1 Input Constraints

| Constraint | Specification | Source |
|-----------|--------------|--------|
| JSON输入最大长度 | 1MB (1,048,576 bytes) | `04` R-08 |
| JSON导出Excel最大行数 | 50000行 | `09` SS5.1 |
| JSON导出Excel最大列数 | 100列 | `09` SS5.1 |
| Base64输入最大长度 | 1MB (1,048,576 bytes) | `04` R-08 |
| 时间戳有效范围 | -2,147,483,648 ~ 2,147,483,647 (32位) | `09` SS8 |
| Cron表达式最大长度 | 256字符 | `09` SS12 |
| URL输入最大长度 | 1MB (1,048,576 bytes) | `04` R-08 |
| 颜色值最大长度 | 32字符 | `09` SS16 |
| 哈希输入最大长度 | 1MB (1,048,576 bytes) | `04` R-08 |
| 历史记录最大条数 | 500条 | `04` R-07 |

### 5.2 Type Constraints

| Field | Type | Constraint |
|-------|------|-----------|
| timestamp input | number | 整数，秒级或毫秒级自动识别 |
| cron count | number | 1-20整数 |
| history limit | number | 1-100整数 |
| history offset | number | >= 0整数 |
| url mode | enum | "component" \| "uri" |
| color fromFormat | enum | "hex" \| "rgb" \| "hsl" |
| hash algorithm | enum | "md5" \| "sha1" \| "sha256" \| "all" |

## 6. Compatibility Requirements

| Item | Min Version | Description |
|------|-----------|------------|
| Microsoft Edge | >= 114 | 支持Side Panel API的最低版本 |
| Chrome Extension API | >= MV3 | 必须使用Manifest V3 |
| chrome.sidePanel | >= Chrome 114 | 侧边栏核心API |
| chrome.storage.local | >= Chrome MV3 | 本地存储API |
| Web Crypto API | >= Chrome 37 | 哈希计算依赖 |
| CSS Custom Properties | >= Chrome 49 | 主题系统依赖 |

---

| Version | Date | Description |
|---------|------|------------|
| v0.1 | 2026-05-14 | Initial draft |
