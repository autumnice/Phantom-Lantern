# Phantom-Lantern 前后端并行重构对齐稿（v2）

## 目标（你当前意图的落地版）

1. **前后端都重构**  
   - 前端：允许“大幅度 UI 风格重构 / 性能优化”，不要求与当前 UI 保持一致。
   - 后端：新增并迁移为 **Python 实现**（建议 FastAPI）。
2. **前后端可独立、并行开发且互不阻塞**  
   - 允许同时启动两个开发环境（两个 IDE / 两个 Claude CLI）各自推进。
3. **并行前提：接口契约先行**  
   - 前端不直接依赖后端实现细节，只依赖“稳定的 HTTP API 契约 + 错误格式 + 类型生成结果”。
4. **测试与 Mock 要服务于并行开发，不成为负担**  
   - 默认以“可交付、可验收”为优先，测试分层按投入产出渐进增强。

## 现状事实（避免规划与代码脱节）

- 当前仓库本质是“前端直连 Gemini”的单体前端：入口在 [index.tsx](file:///Users/gude/codeup/Phantom-Lantern/index.tsx)，直接使用 `@google/genai`。
- `src/` 下已经存在“模块化重构版本”（Context/Hooks/Service 分层），但**未被入口引用**，属于“并存未切换”状态。
- 目前 `vite.config.ts` 会把 `GEMINI_API_KEY` 注入到浏览器包（[vite.config.ts](file:///Users/gude/codeup/Phantom-Lantern/vite.config.ts#L5-L16)），这与“后端化”目标冲突：后端化后应该让 Key 只存在服务端。

## 关键决策（建议默认采用）

### 1) 并行开发的“唯一真相来源”

选择：**OpenAPI（或等价 schema）作为 API 契约的单一真相来源**。

- 前端：从 OpenAPI 生成 TS types（例如 `openapi-typescript`），避免手写类型漂移。
- 后端：以 Pydantic/Schema 为实现，并持续对齐 OpenAPI（FastAPI 自带 OpenAPI 输出）。
- Mock：由契约驱动生成/校验（最小成本：校验；更进一步：自动生成 mock）。

### 2) API 形态：把“Gemini 细节”关在后端

前端只关心这些能力：

- 生成大纲（plan）
- 生成图片（image）
- 导出（export）

Gemini 模型选择、重试策略、图片生成/解析细节统一在后端封装，前端不直接知道 `@google/genai`。

### 3) Gemini 图片场景是否适合 Mock？

适合 Mock，而且建议 Mock。

原因：前端验收通常验证的是：

- 状态流：pending → generating → done/error
- 渲染：能否展示图片、失败提示、重试按钮
- 导出流程：是否能触发导出、是否正确下载/预览

这些不依赖“真实 AI 图片质量”。因此：

- **前端默认使用 mock 图片**（固定 base64 或静态资源 URL），保证稳定、快速、无成本。
- **后端用单元测试 mock Gemini SDK**（验证解析与错误处理）；必要时再做“可选的真实集成测试”。

### 4) 并行开发的集成“闸门”

定义一个清晰的集成闸门，避免前后端互相等待：

- 闸门 A（随时可跑）：契约校验 + mock server + 前端 E2E（不调用 Gemini）
- 闸门 B（按需可跑）：后端集成测试（调用 Gemini，受配额/网络影响）

默认交付以闸门 A 为准；闸门 B 用于发布前或后端自测。

## 推荐目录与工作方式（与旧计划兼容，但更贴近现状）

> 旧计划倾向用 worktree 分出 `frontend/` `backend/`。目前仓库已有前端代码在根目录与 `src/`，优先采用“先在当前仓库内落地 shared + mock + backend”的单仓库策略；除非后续确有需要，再拆 worktree。

建议最终形态：

```
Phantom-Lantern/
  frontend/        # 可选：若你要把前端彻底搬出来
  backend/         # Python FastAPI
  mock-server/     # Node mock（或用 msw / prism）
  shared/
    openapi/       # openapi.yaml / openapi.json
```

并行工作流建议：

- 前端开发：跑前端 + mock-server（不需要后端）
- 后端开发：跑 FastAPI（不需要前端）
- 联调：前端切换 `VITE_API_BASE_URL` 指向后端

## 契约草案（最小可并行版本）

### 统一错误格式（建议）

```
{
  "error": {
    "code": "AI_GENERATION_FAILED",
    "message": "string",
    "details": {},
    "requestId": "string"
  }
}
```

### 建议 endpoints（与旧计划一致，便于迁移）

- `POST /api/v1/presentations/plan`
- `POST /api/v1/presentations/generate-image`
- `POST /api/v1/presentations/generate-images`（可选，前端体验更好）
- `POST /api/v1/presentations/export/pptx`
- `POST /api/v1/presentations/export/pdf`
- `GET /health`

## 测试与 Mock 策略（按“并行”优先排序）

### 前端

1. **E2E（推荐 Playwright）跑在 mock-server 上**  
   - 稳定、可重复、成本低。
   - 验证关键路径：输入 → 大纲 → 生成（mock）→ 导出（mock/本地）。
2. 单元/组件测试（可选）  
   - 只测纯 UI/工具函数，避免测试数量拖累迭代。

### Mock Server（推荐形态）

两种可选实现，按“简到复杂”：

1. **最简 Node mock server**：固定返回 JSON + 固定 base64 图片（与 [parallel-architecture.md](file:///Users/gude/codeup/Phantom-Lantern/docs/refactoring-plan/parallel-architecture.md) 的设计一致）。  
2. **契约驱动 mock**：从 OpenAPI 生成 mock（例如 Prism），并用 fixtures 覆盖关键场景（成功/失败/超时）。

图片 mock 推荐：

- 使用一个很小的 PNG base64（1x1/16x9 占位图）或直接返回图片 URL（本地静态资源）。
- 可做“场景化 fixtures”：例如某一页故意返回错误，验证前端重试与错误提示。

### 后端

1. **单元测试**：mock Gemini 客户端，验证：
   - prompt 拼装是否正确
   - response 解析是否健壮（含异常 JSON、缺字段、空返回）
   - 重试/超时/错误码映射是否一致
2. **可选集成测试**（默认不阻塞前端/CI）  
   - 通过环境变量开关启用；只跑少量“冒烟用例”，避免配额/成本失控。

## 风险点与对策（与你的问题对应）

1. Mock 会不会影响验收？  
   - 只要把验收拆成“UI/流程验收（mock）”与“生成质量验收（真实 Gemini）”，就不会互相拖累。
2. Gemini 图片不太好 mock？  
   - 图片本质是 bytes/base64，mock 非常容易；难点在“质量”，但那不应成为前端验收的阻塞项。
3. E2E 会不会导致任务完成不了？  
   - 采用“只做关键路径 + 跑 mock”的策略，E2E 成本可控；避免做大量 flaky 的真实网络测试。

## 下一步（可直接开始执行的最小动作）

1. 先固化 API 契约（OpenAPI v1），让前后端同时有“可编码的目标”。  
2. 先落 mock-server，让前端彻底不依赖后端进度。  
3. 后端用 FastAPI 起骨架，实现 plan/image 两个最小 endpoints。  
4. 前端把“直连 Gemini”替换为“调用 API client”（保留 feature flag 以便回退）。

## 可执行任务清单（建议从这里开始跑）

- 并行重构可执行任务清单：[executable-tasks-v1.md](file:///Users/gude/codeup/Phantom-Lantern/docs/refactoring-plan/executable-tasks-v1.md)
- 傻瓜式操作手册（开两个 Claude 的步骤）：[ops-manual-v1.md](file:///Users/gude/codeup/Phantom-Lantern/docs/refactoring-plan/ops-manual-v1.md)

## 并行重构前置工作（必须先做清楚的清单）

### 前置 0：并行不互扰的“边界定义”

并行开发要做到互不影响，需要先明确边界（最小可行）：

- **唯一共享物**：API 契约（OpenAPI 文件）+ fixtures（mock 返回示例）+ 错误格式约定
- **禁止共享物**：前端不直接 import/调用 Gemini SDK；后端不依赖前端代码结构
- **切换开关**：前端通过 `VITE_API_BASE_URL` 选择 mock 或真实后端

### 前置 1：API 规划（契约先行）

目标是：前端可以只依赖契约开始开发，后端也能独立实现与自测。

建议一次性确定的内容：

- endpoints 列表（plan / image / export / health）
- request/response schema（含字段命名与枚举）
- 统一错误格式（含 error.code 的集合）
- 超时与重试语义（哪些由前端重试，哪些由后端重试）

落地物（仓库内）：

- `shared/openapi/openapi.yaml`（或 json）
- `shared/fixtures/`（成功/失败/超时 三类最小返回）

### 前置 2：Mock server（先行安装，保证前端可独立验收）

目标是：前端任何时候都能跑通“输入→大纲→图片→导出”的关键流程（即使后端完全没动）。

建议最小能力：

- 支持 `delay`（模拟生成耗时）
- 支持 `delayMs`（模拟生成耗时）
- 支持按 endpoint 返回固定响应（含一个 endpoint 返回 error，用于验证前端错误态）
- 图片返回固定 base64 或本地静态图片 URL

落地物（仓库内）：

- `mock-server/`（独立 package，避免污染根依赖）
- 一键脚本：`npm run dev:mock`（从根目录启动 mock + 前端）

### 前置 3：测试用例准备（按“并行优先”分层）

目标是：测试不阻塞开发，但能兜住集成回归。

推荐分层（越靠前越优先）：

1. **契约校验**：保证前端/后端/Mock 都遵守同一套 schema（最先做）
2. **前端 E2E（跑 mock）**：只测关键路径（避免 flaky）
3. **后端单元测试（mock Gemini）**：测解析、错误映射、重试策略
4. **后端可选集成测试（真实 Gemini）**：用环境变量开关，少量冒烟

最小用例集合（建议）：

- plan 成功返回 slides（包含 visualDescription）
- generate-image 成功返回 imageBase64
- generate-image 失败返回统一 error（检查 code/message）
- plan 返回非 JSON / 缺字段（后端应返回可理解的错误）
- export 返回 fileUrl（mock 可返回固定 url 或 data url）
