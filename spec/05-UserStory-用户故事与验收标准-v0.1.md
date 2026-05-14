# 05 -- User Stories & Acceptance Criteria (DevToolKit Edge Extension)

---

| Item | Value |
|---|---|
| Module ID | DEVTOOL |
| Module Name | DevToolKit Edge Extension |
| Doc Version | v0.1 |
| Stage | Spec (What) |
| Upstream | `03` Proposal / `04` PRD |
| Downstream | -> `06` FSD / `09` API / `13` Test / `14` Trace |

---

## US-001 (P0) JSON格式化与校验

| Field | Content |
|-------|---------|
| **REQ ID** | REQ-DEVTOOL-001 |
| **Story** | As 开发者, I want 在侧边栏中粘贴JSON文本并一键格式化, so that 我能快速阅读和调试JSON数据 |
| **Priority** | P0 |
| **Source** | <- 03 SS1 / 04 SC-01 |
| **Precondition** | 插件已安装，侧边栏已打开 |
| **Func Alignment** | -> 06 SS2 / 07 SS1 |
| **Design Alignment** | -> 08 SS3 / 09 / 10 / 11 SS3 |
| **Verify Alignment** | -> 13 TC-001 / 14 row 1 |

| AC ID | Description (each independently testable) |
|-------|------------------------------------------|
| AC-001-01 | 粘贴合法JSON文本后点击"格式化"，输出缩进为2空格的美化JSON |
| AC-001-02 | 粘贴合法JSON文本后点击"压缩"，输出无空格无换行的最小化JSON |
| AC-001-03 | 粘贴非法JSON文本后，高亮显示错误行号和错误原因 |
| AC-001-04 | 格式化/压缩结果可通过一键复制按钮写入系统剪贴板 |
| AC-001-05 | 输入为空时，格式化/压缩按钮置灰不可点击 |

## US-002 (P0) Unix时间戳转换

| Field | Content |
|-------|---------|
| **REQ ID** | REQ-DEVTOOL-002 |
| **Story** | As 开发者, I want 在侧边栏中快速转换Unix时间戳与可读日期, so that 我能高效处理时间相关数据 |
| **Priority** | P0 |
| **Source** | <- 03 SS1 / 04 SC-02 |
| **Precondition** | 插件已安装，侧边栏已打开 |
| **Func Alignment** | -> 06 SS2 / 07 SS1 |
| **Design Alignment** | -> 08 SS3 / 09 / 10 / 11 SS3 |
| **Verify Alignment** | -> 13 TC-002 / 14 row 2 |

| AC ID | Description (each independently testable) |
|-------|------------------------------------------|
| AC-002-01 | 输入Unix时间戳（秒级），显示对应的可读日期时间（本地时区） |
| AC-002-02 | 输入Unix时间戳（毫秒级），自动识别并显示对应的可读日期时间 |
| AC-002-03 | 选择日期时间后，显示对应的Unix时间戳（秒级和毫秒级） |
| AC-002-04 | 实时显示当前Unix时间戳，每秒更新 |
| AC-002-05 | 支持切换时区显示（UTC/本地/自定义） |
| AC-002-06 | 转换结果可通过一键复制按钮写入系统剪贴板 |

## US-003 (P0) Cron表达式生成器

| Field | Content |
|-------|---------|
| **REQ ID** | REQ-DEVTOOL-003 |
| **Story** | As 开发者, I want 通过可视化界面生成和验证Cron表达式, so that 我能准确编写定时任务配置而无需记忆Cron语法 |
| **Priority** | P0 |
| **Source** | <- 03 SS1 / 04 SC-03 |
| **Precondition** | 插件已安装，侧边栏已打开 |
| **Func Alignment** | -> 06 SS2 / 07 SS1 |
| **Design Alignment** | -> 08 SS3 / 09 / 10 / 11 SS3 |
| **Verify Alignment** | -> 13 TC-003 / 14 row 3 |

| AC ID | Description (each independently testable) |
|-------|------------------------------------------|
| AC-003-01 | 通过下拉选择/输入各字段（秒/分/时/日/月/周），自动生成Cron表达式 |
| AC-003-02 | 手动编辑Cron表达式时，各字段选择器同步更新 |
| AC-003-03 | 输入Cron表达式后，显示自然语言描述（如"每天上午9点"） |
| AC-003-04 | 输入Cron表达式后，显示接下来5次执行时间 |
| AC-003-05 | 输入非法Cron表达式时，显示错误提示 |
| AC-003-06 | 支持常见Cron预设快捷选择（每分钟/每小时/每天/每周/每月） |
| AC-003-07 | 生成的表达式可通过一键复制按钮写入系统剪贴板 |

## US-004 (P0) Base64编解码

| Field | Content |
|-------|---------|
| **REQ ID** | REQ-DEVTOOL-004 |
| **Story** | As 开发者, I want 在侧边栏中快速进行Base64编码和解码, so that 我能便捷处理Base64数据 |
| **Priority** | P0 |
| **Source** | <- 03 SS1 / 04 SC-04 |
| **Precondition** | 插件已安装，侧边栏已打开 |
| **Func Alignment** | -> 06 SS2 / 07 SS1 |
| **Design Alignment** | -> 08 SS3 / 09 / 10 / 11 SS3 |
| **Verify Alignment** | -> 13 TC-004 / 14 row 4 |

| AC ID | Description (each independently testable) |
|-------|------------------------------------------|
| AC-004-01 | 输入文本，点击"编码"，输出Base64编码结果 |
| AC-004-02 | 输入Base64字符串，点击"解码"，输出解码后文本 |
| AC-004-03 | 输入非法Base64字符串时，显示解码错误提示 |
| AC-004-04 | 编解码结果可通过一键复制按钮写入系统剪贴板 |
| AC-004-05 | 支持UTF-8中文字符的编解码 |

## US-005 (P0) 工具间快速切换

| Field | Content |
|-------|---------|
| **REQ ID** | REQ-DEVTOOL-005 |
| **Story** | As 开发者, I want 在各工具间快速切换且保留输入状态, so that 我能高效使用多个工具而无需重复输入 |
| **Priority** | P0 |
| **Source** | <- 03 SS1 / 04 SC-05 |
| **Precondition** | 插件已安装，侧边栏已打开 |
| **Func Alignment** | -> 06 SS1 / 07 SS1 |
| **Design Alignment** | -> 08 SS3 / 09 / 10 / 11 SS3 |
| **Verify Alignment** | -> 13 TC-005 / 14 row 5 |

| AC ID | Description (each independently testable) |
|-------|------------------------------------------|
| AC-005-01 | 侧边栏左侧显示工具导航列表，点击即可切换到对应工具 |
| AC-005-02 | 切换工具后，之前工具的输入内容和结果保留，再次切换回来时恢复 |
| AC-005-03 | 工具切换完成时间 < 200ms |
| AC-005-04 | 当前选中的工具在导航中高亮显示 |
| AC-005-05 | 支持键盘快捷键切换工具（Ctrl+数字键） |

## US-006 (P1) 本地历史记录

| Field | Content |
|-------|---------|
| **REQ ID** | REQ-DEVTOOL-006 |
| **Story** | As 开发者, I want 查看和回溯之前的工具使用记录, so that 我能快速复用之前的操作而无需重复输入 |
| **Priority** | P1 |
| **Source** | <- 03 SS1 / 04 SC-06 |
| **Precondition** | 插件已安装，有历史操作记录 |
| **Func Alignment** | -> 06 SS2 / 07 SS5 |
| **Design Alignment** | -> 08 SS3 / 09 / 10 / 11 SS3 |
| **Verify Alignment** | -> 13 TC-006 / 14 row 6 |

| AC ID | Description (each independently testable) |
|-------|------------------------------------------|
| AC-006-01 | 点击历史记录按钮，显示按时间倒序排列的历史列表 |
| AC-006-02 | 每条历史记录显示：工具类型、操作摘要、时间戳 |
| AC-006-03 | 点击历史记录条目，自动填充对应工具的输入区域 |
| AC-006-04 | 支持删除单条历史记录 |
| AC-006-05 | 支持清空所有历史记录 |
| AC-006-06 | 历史记录最多保留500条，超出后自动淘汰最旧记录 |

## US-007 (P1) URL编解码

| Field | Content |
|-------|---------|
| **REQ ID** | REQ-DEVTOOL-007 |
| **Story** | As 开发者, I want 在侧边栏中快速进行URL编码和解码, so that 我能便捷处理URL中的特殊字符 |
| **Priority** | P1 |
| **Source** | <- 04 SC-07 |
| **Precondition** | 插件已安装，侧边栏已打开 |
| **Func Alignment** | -> 06 SS2 / 07 SS1 |
| **Design Alignment** | -> 08 SS3 / 09 / 10 / 11 SS3 |
| **Verify Alignment** | -> 13 TC-007 / 14 row 7 |

| AC ID | Description (each independently testable) |
|-------|------------------------------------------|
| AC-007-01 | 输入URL文本，点击"编码"，输出URL编码结果 |
| AC-007-02 | 输入URL编码字符串，点击"解码"，输出解码后文本 |
| AC-007-03 | 支持encodeURIComponent和encodeURI两种编码模式 |
| AC-007-04 | 编解码结果可通过一键复制按钮写入系统剪贴板 |

## US-008 (P1) 颜色格式转换

| Field | Content |
|-------|---------|
| **REQ ID** | REQ-DEVTOOL-008 |
| **Story** | As 前端开发者, I want 在侧边栏中快速转换颜色格式, so that 我能在不同CSS颜色表示法之间高效切换 |
| **Priority** | P1 |
| **Source** | <- 04 SC-08 |
| **Precondition** | 插件已安装，侧边栏已打开 |
| **Func Alignment** | -> 06 SS2 / 07 SS1 |
| **Design Alignment** | -> 08 SS3 / 09 / 10 / 11 SS3 |
| **Verify Alignment** | -> 13 TC-008 / 14 row 8 |

| AC ID | Description (each independently testable) |
|-------|------------------------------------------|
| AC-008-01 | 输入HEX值，显示对应的RGB和HSL值 |
| AC-008-02 | 输入RGB值，显示对应的HEX和HSL值 |
| AC-008-03 | 输入HSL值，显示对应的HEX和RGB值 |
| AC-008-04 | 提供颜色选择器可视化选色 |
| AC-008-05 | 各格式值可通过一键复制按钮写入系统剪贴板 |

## US-009 (P1) 哈希计算

| Field | Content |
|-------|---------|
| **REQ ID** | REQ-DEVTOOL-009 |
| **Story** | As 开发者, I want 在侧边栏中计算文本的哈希值, so that 我能快速验证数据完整性 |
| **Priority** | P1 |
| **Source** | <- 04 SC-09 |
| **Precondition** | 插件已安装，侧边栏已打开 |
| **Func Alignment** | -> 06 SS2 / 07 SS1 |
| **Design Alignment** | -> 08 SS3 / 09 / 10 / 11 SS3 |
| **Verify Alignment** | -> 13 TC-009 / 14 row 9 |

| AC ID | Description (each independently testable) |
|-------|------------------------------------------|
| AC-009-01 | 输入文本，选择MD5算法，显示MD5哈希值 |
| AC-009-02 | 输入文本，选择SHA-1算法，显示SHA-1哈希值 |
| AC-009-03 | 输入文本，选择SHA-256算法，显示SHA-256哈希值 |
| AC-009-04 | 支持同时显示所有算法的哈希值 |
| AC-009-05 | 哈希值可通过一键复制按钮写入系统剪贴板 |

## US-010 (P1) 深色/浅色主题

| Field | Content |
|-------|---------|
| **REQ ID** | REQ-DEVTOOL-010 |
| **Story** | As 开发者, I want 切换深色/浅色主题, so that 我能在不同光线环境下舒适使用 |
| **Priority** | P1 |
| **Source** | <- 04 R-09 |
| **Precondition** | 插件已安装 |
| **Func Alignment** | -> 06 SS1 / 07 SS6 |
| **Design Alignment** | -> 08 SS3 |
| **Verify Alignment** | -> 13 TC-010 / 14 row 10 |

| AC ID | Description (each independently testable) |
|-------|------------------------------------------|
| AC-010-01 | 支持深色主题和浅色主题切换 |
| AC-010-02 | 默认跟随系统主题设置 |
| AC-010-03 | 主题设置持久化，重启插件后保持 |

## US-011 (P0) JSON转Excel导出

| Field | Content |
|-------|---------|
| **REQ ID** | REQ-DEVTOOL-011 |
| **Story** | As 开发者, I want 将JSON数组数据导出为Excel文件, so that 我能方便地对API返回数据进行分析和分享 |
| **Priority** | P0 |
| **Source** | <- 04 SC-10 / 04 R-11~R-13 |
| **Precondition** | 插件已安装，侧边栏已打开，JSON工具已选中 |
| **Func Alignment** | -> 06 SS3 / 07 SS1 |
| **Design Alignment** | -> 08 SS3 / 09 / 10 / 11 SS3 |
| **Verify Alignment** | -> 13 TC-011 / 14 row 11 |

| AC ID | Description (each independently testable) |
|-------|------------------------------------------|
| AC-011-01 | 输入JSON数组（Array of Object），点击"导出Excel"，生成并下载.xlsx文件 |
| AC-011-02 | 导出的Excel文件以JSON对象的键作为列标题，每条对象为一行 |
| AC-011-03 | 输入非JSON数组格式（如单个对象、非JSON文本）时，显示错误提示"仅支持JSON数组格式" |
| AC-011-04 | 支持自定义工作表名称（Sheet Name），默认为"Sheet1" |
| AC-011-05 | 导出的Excel文件正确显示中文内容（UTF-8编码） |
| AC-011-06 | 嵌套JSON对象在Excel中以JSON字符串形式展示 |
| AC-011-07 | 导出过程在本地完成，不发送任何数据到远程服务器 |

## Requirements Traceability Index

| REQ ID | UserStory | Priority | ->06 FSD | ->09 API | ->11 Security | ->13 TC | ->14 Trace |
|--------|-----------|----------|----------|----------|---------------|---------|-----------|
| REQ-DEVTOOL-001 | JSON格式化与校验 | **P0** | SS2 | /json/format, /json/minify, /json/validate | SS3 | TC-001 | row 1 |
| REQ-DEVTOOL-002 | Unix时间戳转换 | **P0** | SS2 | /timestamp/convert, /timestamp/now | SS3 | TC-002 | row 2 |
| REQ-DEVTOOL-003 | Cron表达式生成器 | **P0** | SS2 | /cron/generate, /cron/parse, /cron/next-runs | SS3 | TC-003 | row 3 |
| REQ-DEVTOOL-004 | Base64编解码 | **P0** | SS2 | /base64/encode, /base64/decode | SS3 | TC-004 | row 4 |
| REQ-DEVTOOL-005 | 工具间快速切换 | **P0** | SS1 | N/A (纯前端) | SS3 | TC-005 | row 5 |
| REQ-DEVTOOL-006 | 本地历史记录 | P1 | SS2 | /history/list, /history/delete, /history/clear | SS3 | TC-006 | row 6 |
| REQ-DEVTOOL-007 | URL编解码 | P1 | SS2 | /url/encode, /url/decode | SS3 | TC-007 | row 7 |
| REQ-DEVTOOL-008 | 颜色格式转换 | P1 | SS2 | /color/convert | SS3 | TC-008 | row 8 |
| REQ-DEVTOOL-009 | 哈希计算 | P1 | SS2 | /hash/compute | SS3 | TC-009 | row 9 |
| REQ-DEVTOOL-010 | 深色/浅色主题 | P1 | SS1 | N/A (纯前端) | N/A | TC-010 | row 10 |
| REQ-DEVTOOL-011 | JSON转Excel导出 | **P0** | SS3 | /json/exportExcel | SS3 | TC-011 | row 11 |

---

| Version | Date | Description |
|---------|------|------------|
| v0.1 | 2026-05-14 | Initial draft |
| v0.2 | 2026-05-14 | 新增US-011 JSON转Excel导出 |
