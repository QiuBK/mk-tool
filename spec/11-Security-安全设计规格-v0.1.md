# 11 -- Security Design Specification (DevToolKit Edge Extension)

---

| Item | Value |
|---|---|
| Module ID | DEVTOOL |
| Module Name | DevToolKit Edge Extension |
| Doc Version | v0.1 |
| Stage | Design (Security) |
| Tech Stack | React 18 + TypeScript + Edge Extension Manifest V3 |
| Trace | <- Based on `07` NFR Security / -> Security acceptance in `13` Test |

---

## 1. Security Objectives & Compliance

| Security Objective | Description | Compliance Reference |
|-------------------|------------|---------------------|
| 数据零传输 | 所有用户输入数据在本地处理，不发送到任何远程服务器 | 04 R-01, Chrome Web Store隐私政策 |
| 本地数据保护 | 用户数据仅存储在chrome.storage.local沙箱中，其他扩展无法访问 | Chrome Extension安全模型 |
| 输入安全 | 所有用户输入经过验证和清理，防止注入攻击 | OWASP Input Validation |

## 2. Authentication & Authorization

### 2.1 Authentication Mechanism

| Item | Specification |
|------|--------------|
| Auth Method | 不适用 - 无远程服务，无需认证 |
| Token Validity | 不适用 |
| Password Policy | 不适用 |
| MFA | 不适用 |

### 2.2 Role & Permission Matrix

| Role | 使用工具 | 管理历史 | 修改偏好 | 管理扩展 |
|------|---------|---------|---------|---------|
| 普通用户 | Y | Y (仅自己的) | Y | N |

> 注：本扩展为单用户本地应用，无多角色需求。

## 3. Data Security

### 3.1 Data Classification

| Data Type | Security Level | Examples | Protection |
|-----------|---------------|---------|-----------|
| 用户输入文本 | **Confidential** | JSON数据、Base64字符串、时间戳 | 仅chrome.storage.local，不离开浏览器 |
| 历史记录 | **Internal** | 工具使用记录 | chrome.storage.local，可手动清除 |
| 用户偏好 | General | 主题设置、默认算法 | chrome.storage.local |

### 3.2 Encryption Strategy

| Scenario | Method | Description |
|----------|--------|------------|
| Transit | 不适用 | 无网络传输 |
| Storage | chrome.storage.local沙箱 | 依赖浏览器沙箱安全机制，数据不加密存储（性能优先） |
| Key Management | 不适用 | 无加密密钥 |

## 4. API Security

| Protection | Implementation | Description |
|-----------|---------------|------------|
| Input Validation | Service层统一校验 | 每个Service函数入口验证输入类型、长度、格式 |
| File Download Safety | Blob URL + `<a download>` + 立即释放 | Excel导出使用Blob URL触发下载，下载完成后立即释放URL，防止被其他页面访问 |
| SQL Injection | 不适用 | 无SQL数据库 |
| XSS | React默认转义 + CSP | React自动转义HTML，manifest.json配置严格CSP禁止inline script |
| CSRF | 不适用 | 无网络请求 |
| Rate Limiting | 不适用 | 无网络请求，本地处理无速率限制需求 |
| Content Security Policy | manifest.json CSP配置 | 限制script-src为自身，禁止eval和inline script |

### 4.1 CSP Configuration

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  }
}
```

## 5. AI/LLM Security (if applicable)

> 不适用 - 本项目不涉及AI/LLM集成。

## 6. Audit & Logging

| Event Type | Recorded Content | Retention | Alert |
|-----------|-----------------|-----------|-------|
| 错误事件 | error.code + error.message + timestamp | 会话内 | console.error输出 |
| 存储事件 | 操作类型 + 数据大小 | 不持久化 | 接近quota时console.warn |

> 注：本扩展为本地工具，不实现远程日志。开发阶段使用console输出调试信息，生产版本移除。

## 7. Security Threat List (STRIDE)

| Type | Threat | Risk Level | Mitigation | Owner |
|------|--------|-----------|-----------|-------|
| S (Spoofing) | 恶意扩展冒充本扩展 | 低 | Edge Add-ons商店审核 + 扩展ID唯一 | Platform |
| T (Tampering) | 恶意页面注入脚本到Side Panel | 中 | 严格CSP策略 + React自动转义 | Engineering |
| R (Repudiation) | 用户否认操作历史 | 低 | 历史记录仅用于便利，不作为审计依据 | Product |
| I (Information Disclosure) | 用户输入数据泄露到网络 | **高** | 零网络传输设计 + manifest.json不申请网络权限 | Engineering |
| I (Information Disclosure) | Excel导出文件被恶意网站截获 | 低 | 使用Blob URL + `<a download>` 触发下载，URL在下载后立即释放 | Engineering |
| D (Denial of Service) | 大输入导致扩展卡死 | 中 | 输入大小限制 + Web Worker异步处理 | Engineering |
| E (Elevation of Privilege) | 扩展获取超出需要的权限 | 中 | 最小权限原则，仅申请必要权限 | Engineering |

## 8. Deployment Security

- [x] 生产/开发环境**严格隔离**（开发使用localhost，生产为打包扩展）
- [ ] 数据库访问限制 - 不适用（无数据库）
- [x] 敏感配置通过环境变量 - 不涉及（无敏感配置）
- [x] 依赖安全扫描（`npm audit`）- CI/CD中集成
- [x] manifest.json权限最小化 - 仅申请storage和sidePanel权限
- [x] CSP策略配置 - 禁止inline script和eval

### 8.1 Manifest Permissions

```json
{
  "permissions": [
    "storage",
    "sidePanel"
  ],
  "optional_permissions": []
}
```

> 最小权限原则：仅申请storage（本地存储）和sidePanel（侧边栏）权限，不申请tabs、bookmarks、history等敏感权限。

---

| Version | Date | Description |
|---------|------|------------|
| v0.1 | 2026-05-14 | Initial draft |
