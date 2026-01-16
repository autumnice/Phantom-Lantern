# AI Coding 执行规范（v1）

目的：让 AI coding 过程“少歧义、可验收、可并行”，做到你期望的：AI 只需要按文档执行就能高效完成任务。

## 0. 这套计划需要改进吗？

需要，但不是推翻：核心结构（契约先行 + mock 优先 + 闸门 A/B + 并行分轨）是对的；缺的是“AI 可执行性”的工程化细节：

- 每个任务需要**固定格式的任务卡**（输入/输出/禁止项/验收命令）
- 对 OpenAPI 的变更需要**固定流程**（否则前后端会漂移）
- 对依赖新增、目录结构、接口字段命名等，需要**硬规则**（否则 AI 会自己“想当然”）

本文件就是把这些硬规则补齐。

## 1. 全局硬规则（AI 必须遵守）

### 1.1 唯一共享物

- 只能共享：OpenAPI 契约 + fixtures + 错误格式约定
- 禁止共享：前端实现细节、后端内部实现、Gemini SDK 直接调用（前端不直连）

对应文件：

- 契约：[shared/openapi/openapi.yaml](file:///Users/gude/codeup/Phantom-Lantern/shared/openapi/openapi.yaml)
- fixtures：[shared/fixtures](file:///Users/gude/codeup/Phantom-Lantern/shared/fixtures/README.md)

### 1.1.1 架构决策（ADR）同样视为“约束输入”

当存在 ADR 时，AI 必须以 ADR 为准执行，除非任务卡明确要求变更 ADR。

- 导出责任归属（已决策）：[export-responsibility-v1.md](file:///Users/gude/codeup/Phantom-Lantern/docs/adr/export-responsibility-v1.md)
- 前端重构主线（已决策）：[frontend-refactor-mainline-v1.md](file:///Users/gude/codeup/Phantom-Lantern/docs/adr/frontend-refactor-mainline-v1.md)

### 1.2 依赖新增规则

- AI 不得引入新依赖，除非任务卡明确写了“允许新增依赖”与“原因”
- 新依赖必须落到对应子工程（mock-server / backend / frontend），不能污染根工程

### 1.3 命名与字段规则（减少歧义）

- API request/response 字段统一为 camelCase（以 OpenAPI 为准）
- 枚举值严格按 OpenAPI（例如 aspectRatio/imageSize）
- 错误返回统一为 ErrorEnvelope（以 OpenAPI 为准）

## 2. OpenAPI 变更流程（最重要）

当任何人（或任何 AI）需要改接口（加字段/改字段/改枚举/改错误码）：

1. 先改 `shared/openapi/openapi.yaml`
2. 同步改 `shared/fixtures`（至少 success + error 相关示例）
3. 同步改 mock-server 的 `mock-server/data/api-responses.json`
4. 再改前端/后端实现

验收（变更完成的最低标准）：

- mock-server 能返回与 OpenAPI 一致的字段
- 前端/后端任一侧不会出现“临时兼容分支”来掩盖契约漂移

## 3. 任务卡模板（复制即可用）

> 建议把每个任务都写成下面格式，AI 几乎不会走偏。

### Task Card 模板

**Task ID**：FE-?/BE-?/S-?/INT-?  
**目标**：一句话说明要完成什么（可验收）  
**范围**：
- In-scope：
- Out-of-scope：
**输入（Inputs）**：
- 契约/文档：
- 现有代码入口：
**产出（Outputs）**：
- 新增/修改的文件清单：
- 行为变化清单：
**硬约束（Must）**：
- 例如：不得新增依赖；不得直连 Gemini；不得修改 OpenAPI 等
**验收标准（DoD）**：
- UI/接口层面的验收点
- 必跑命令（如果有）：`npm test` / `pytest` / `curl` 等
**风险与回滚**：
- 最坏情况怎么回退（feature flag / 配置切换）

## 4. AI 提示词模板（小白可直接复制）

### 4.1 前端 Claude 模板（带硬约束）

```
你负责 Frontend Track：前端独立重构，不依赖后端进度。
只允许依赖：shared/openapi/openapi.yaml、shared/fixtures、mock-server。
硬约束：
1) 不得在浏览器侧使用 Gemini API Key；不得直连 Gemini；
2) 所有请求只能走 API client，且只能通过 VITE_API_BASE_URL 切换 mock/real；
3) 不得修改 shared/openapi/openapi.yaml（除非我明确给你一个契约变更任务卡）；
4) 不得新增依赖（除非任务卡明确允许）。

执行依据：
1) docs/refactoring-plan/executable-tasks-v1.md（Frontend Track）
2) docs/refactoring-plan/frontend-refactor-tasks-v1.md（细化任务）
3) docs/refactoring-plan/testing-and-mock-v1.md（测试闸门）

交付要求：每完成一个任务卡，输出“改了哪些文件 + 如何验收（命令/步骤）+ 风险点”。
```

### 4.2 后端 Claude 模板（带硬约束）

```
你负责 Backend Track：Python/FastAPI 实现 shared/openapi/openapi.yaml 定义的 API。
硬约束：
1) OpenAPI 为单一真相；任何 API 变更先改契约文件（除非我明确授权）；
2) 所有错误必须返回 ErrorEnvelope（error.code/message/details?/requestId?）；
3) Gemini Key 仅存在后端；默认单元测试 mock Gemini；
4) 不得新增依赖（除非任务卡明确允许）。

执行依据：
1) docs/refactoring-plan/executable-tasks-v1.md（Backend Track）
2) docs/refactoring-plan/backend-refactor-tasks-v1.md（细化任务）
3) docs/refactoring-plan/testing-and-mock-v1.md（测试闸门）

交付要求：每完成一个任务卡，输出“接口是否符合 OpenAPI + 如何自测（curl/pytest）+ 错误码映射说明”。
```

### 4.3 “契约变更”专用模板（避免歧义）

```
你现在要执行一个“契约变更任务”。
必须先修改 shared/openapi/openapi.yaml，再同步 shared/fixtures 与 mock-server fixtures，最后再改实现。
任何实现侧的临时兼容分支都禁止引入。
```

## 5. 验收与闸门（AI 不得跳过）

### Gate A（默认必须通过）

- 契约一致（OpenAPI/fixtures/mock 三者一致）
- 前端关键流程在 mock-server 下可验收（可演示或 E2E）
- 后端单元测试不依赖真实 Gemini 且可稳定运行

### Gate B（可选）

- 真实 Gemini 冒烟：发布前跑 1-2 个用例即可

## 6. 你下一步怎么用这套规范（最小动作）

1. 继续以 [ops-manual-v1.md](file:///Users/gude/codeup/Phantom-Lantern/docs/refactoring-plan/ops-manual-v1.md) 的步骤启动环境
2. 同时启动两个 Claude，把本文件的“前端模板/后端模板”分别粘贴进去
3. 让它们按 `executable-tasks-v1.md` 从 FE-1 与 BE-1 开始逐条完成
