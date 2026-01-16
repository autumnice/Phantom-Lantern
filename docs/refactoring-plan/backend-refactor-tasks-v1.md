# 后端（Python）独立重构任务清单（v1）

## 适用范围与目标

适用于“后端独立实现 FastAPI + Gemini 封装 + 导出服务”，不依赖前端进度；对齐 API 契约即可并行推进。

目标：

- 把 Gemini 调用完全迁移到服务端，前端不再持有 Key。
- 以 OpenAPI 为单一真相，输出稳定的 HTTP API（plan/image/export）。
- 测试以“mock Gemini 的单元测试”为主，“真实 Gemini 冒烟”为可选。

依赖（唯一共享物）：

- API 契约：[openapi.yaml](file:///Users/gude/codeup/Phantom-Lantern/shared/openapi/openapi.yaml)
- fixtures（用于对齐字段/错误格式）：[shared/fixtures](file:///Users/gude/codeup/Phantom-Lantern/shared/fixtures/README.md)

## 并行边界（后端侧必须遵守）

- 所有 API 变更先改 OpenAPI，再改实现；避免与前端漂移。
- 输出统一错误格式（`ErrorEnvelope`），错误码集合固定（见 OpenAPI）。
- 不依赖前端工程结构；只需保证 API 行为与契约一致。
- 导出责任归属以 ADR 为准（后端生成文件并提供下载）：[export-responsibility-v1.md](file:///Users/gude/codeup/Phantom-Lantern/docs/adr/export-responsibility-v1.md)

## 任务列表（按推荐顺序）

### BE-0：工程骨架与运行方式

任务：

- 建立 `backend/` Python 工程（建议 FastAPI + Uvicorn）。
- 技术要求约定：
  - Python >= 3.11
  - 依赖管理：Poetry
  - ASGI Server：Uvicorn
- 项目结构约定（可按需调整，但需稳定）：
  ```
  backend/
    app/
      main.py
      routes/
        health.py
        presentations.py
      services/
        gemini.py
        export.py
      schemas/
        errors.py
        requests.py
        responses.py
    tests/
      unit/
      integration/
    pyproject.toml
    .env.example
  ```
- 配置环境变量：`GEMINI_API_KEY` 仅在后端存在。
- 配置 CORS（允许本地前端开发域）。
  - 默认建议 origins（可在 BE-1 联调前按需调整）：
    - http://localhost:3000
    - http://localhost:5173
    - http://127.0.0.1:3000
    - http://127.0.0.1:5173

验收：

- `GET /health` 返回 200。
- 本地启动与热重载可用。

### BE-1：契约落地（路由与 schema 对齐）

任务：

- 按 OpenAPI 实现 endpoints：
  - `POST /api/v1/presentations/plan`
  - `POST /api/v1/presentations/generate-image`
  - `POST /api/v1/presentations/generate-images`（建议实现，前端体验更好）
  - `POST /api/v1/presentations/export/pptx`
  - `POST /api/v1/presentations/export/pdf`
- 定义 Pydantic models 与字段命名，保证与 OpenAPI 一致。

验收：

- 每个接口至少能返回“占位成功响应”（不接 Gemini 也行），用于先打通联调。

### BE-2：统一错误处理与错误码映射

任务：

- 统一错误 envelope：`{ error: { code, message, details?, requestId? } }`
- 为常见错误映射固定 error.code（例如：参数校验、Gemini 超时、配额、解析失败、导出失败）。
- requestId：建议每次请求生成并回传，便于排障。

验收：

- 任何 4xx/5xx 都能返回统一格式（而不是框架默认 HTML/文本）。
- 最少覆盖：校验失败（400）与内部错误（500）。

### BE-3：Gemini Service 封装（核心）

任务：

- 把 prompt 拼装、模型选择、重试/超时策略封装在 service 层。
- plan：输出结构化 JSON（slides），解析要健壮。
- image：返回 `imageBase64`（data URL 或 base64），并确保大小/格式符合前端预期。
- batch：并发/限流策略（先串行也可，后续再优化）。

验收：

- mock Gemini 的单元测试可覆盖解析与错误映射（见 BE-5）。
- 在本地用真实 key 可手动跑通 1 次（非必须纳入 CI）。

### BE-4：导出服务（PPTX/PDF）

任务：

- 根据前端传入 slides（含图片）生成可下载文件或返回可访问链接。
- 文件存储策略（最小可行：本地临时目录 + staticfiles 挂载下载）。

验收：

- export endpoints 返回 `fileUrl` 且可下载。
- 失败时输出统一错误 envelope。

### BE-5：测试（默认不依赖真实 Gemini）

任务：

- 单元测试（重点）：
  - prompt/参数校验
  - Gemini 返回解析健壮性（坏 JSON、缺字段、空返回）
  - 错误码映射一致性
- 可选集成冒烟（开关）：
  - 环境变量开关启用
  - 只跑少量用例

验收：

- 默认测试集不依赖外部网络与配额，能稳定运行。

参考策略文档：[testing-and-mock-v1.md](file:///Users/gude/codeup/Phantom-Lantern/docs/refactoring-plan/testing-and-mock-v1.md)

### BE-6：OpenAPI 输出与契约校验（持续对齐）

任务：

- 确保后端对外暴露 OpenAPI 文档（FastAPI 默认 `/openapi.json`）。
- 提供“契约一致性检查”机制（最小可行：人工对比；后续可加自动化 diff）。

验收：

- 后端实际输出的 schema 与 `shared/openapi/openapi.yaml` 不出现未沟通的漂移。
