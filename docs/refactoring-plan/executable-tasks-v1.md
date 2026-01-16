# 并行重构可执行任务清单（v1）

目标：让你可以同时启动“前端 CLI/IDE”和“后端 CLI/IDE”各自独立推进；双方只共享 **OpenAPI 契约 + fixtures + 错误格式**，其余互不依赖。

## 任务分轨道

- **Shared（共享前置）**：一次性定规则与边界，避免后续互相等待
- **Frontend Track（前端独立）**：全程走 mock-server 验收
- **Backend Track（后端独立）**：按契约实现 FastAPI + Gemini 封装（默认单测 mock Gemini）
- **Integration Track（集成/回切）**：前后端都通过各自验收后再做

## Shared（共享前置）任务

### S-0 配置类型生成（减少手写漂移）

输入：
- [openapi.yaml](file:///Users/gude/codeup/Phantom-Lantern/shared/openapi/openapi.yaml)

产出：
- 前端类型生成方式明确（二选一）：
  - A：使用 openapi-typescript 等工具生成 `src/types/api.generated.ts`
  - B：短期先手工对齐，但必须在任务卡中写明“后续补自动生成”

验收：
- 前端类型的来源被明确记录（不再“口头约定”）

### S-1 固化“唯一共享物”与目录规范

输入：
- [openapi.yaml](file:///Users/gude/codeup/Phantom-Lantern/shared/openapi/openapi.yaml)
- [shared/fixtures](file:///Users/gude/codeup/Phantom-Lantern/shared/fixtures/README.md)

产出：
- 约定：任何接口字段/错误码/枚举变更先改 OpenAPI，再改实现与 mock
- 约定：前端不直连 Gemini；后端不依赖前端工程结构

验收（DoD）：
- 前后端各自的任务文档/PR 描述引用同一份 OpenAPI 文件

### S-2 定义错误码集合与错误映射原则

输入：
- OpenAPI 中 `ErrorCode` 枚举

产出：
- 一份简短映射表（写在各自 Track 的实现说明里即可）：哪些错误触发哪些 code（例如超时、配额、解析失败、导出失败）

验收：
- mock-server、前端错误 UI、后端错误返回三者格式一致（`ErrorEnvelope`）

### S-3 维护最小 fixtures（成功/失败/超时）

输入：
- [shared/fixtures](file:///Users/gude/codeup/Phantom-Lantern/shared/fixtures/README.md)

产出：
- 至少 3 类 fixtures：
  - plan success
  - image success
  - error（AI_GENERATION_FAILED 或 TIMEOUT）

验收：
- 前端 E2E 可稳定复现成功与失败分支

### S-4 mock-server 作为前端验收的“默认后端”

输入：
- [mock-server](file:///Users/gude/codeup/Phantom-Lantern/mock-server)

产出：
- 约定端口：mock 3001、backend 8000（已写在 OpenAPI servers）
- 约定切换方式：前端只通过 `VITE_API_BASE_URL` 选择 mock/real

验收：
- 前端在完全不启动 python 后端时，仍可完成关键流程演示

## Frontend Track（前端独立）任务

> 推荐把下面整段直接复制给“前端 Claude CLI”，作为它的工作清单。

### FE-1 选定重构主线并冻结接口依赖点

输入：
- 当前两套实现：根入口 [index.tsx](file:///Users/gude/codeup/Phantom-Lantern/index.tsx) 与模块化 `src/`（见目录 [src](file:///Users/gude/codeup/Phantom-Lantern/src)）

产出：
- 重构主线选择以 ADR 为准（方案 A：以 src 为主线，最后切入口）：
  [frontend-refactor-mainline-v1.md](file:///Users/gude/codeup/Phantom-Lantern/docs/adr/frontend-refactor-mainline-v1.md)
- 列出前端唯一依赖的 API 调用点（plan/image/export/health）

验收：
- 任何新功能都不直接依赖 Gemini SDK；仅依赖 API client

### FE-2 落地 API Client（对齐 OpenAPI）

输入：
- [openapi.yaml](file:///Users/gude/codeup/Phantom-Lantern/shared/openapi/openapi.yaml)

产出：
- 一个稳定的 client 层：`generatePlan/generateImage/generateImagesBatch/exportPptx/exportPdf/health`
- 统一错误解析：把 `ErrorEnvelope` 转成前端可展示结构
- client 位置约定：
  ```
  src/services/api/
    client.ts
    gemini.ts
    index.ts
  ```

验收：
- 在 mock-server 上能跑通 plan 与 image 的调用与 UI 渲染

### FE-3 以 mock-server 为默认验收环境

输入：
- `VITE_API_BASE_URL=http://localhost:3001`

产出：
- 本地开发与验收默认连 mock（不改业务代码，只靠配置）
- UI 能覆盖成功与失败分支（mock 中 batch 已含失败示例）

验收：
- 不启动 python 后端也能完成关键流程

### FE-4 UI/UX 大改与性能优化（核心重构空间）

输入：
- 现有 UI 与交互（不限保留）

产出：
- 新的设计风格/组件体系/交互反馈
- 性能优化点（以可解释/可复现的收益为主）

验收：
- mock-server 下关键流程体验完整，loading/error/retry 清晰

### FE-5 最小测试（不阻塞）

输入：
- [testing-and-mock-v1.md](file:///Users/gude/codeup/Phantom-Lantern/docs/refactoring-plan/testing-and-mock-v1.md)

产出：
- 只覆盖关键路径的 E2E（跑 mock-server）

验收：
- 本地稳定可跑；不依赖真实网络与真实 Gemini

### 复制给“前端 Claude CLI”的任务描述

```
你负责 Frontend Track：前端独立重构，不依赖后端进度。
硬约束：只依赖 shared/openapi/openapi.yaml 与 mock-server；不直连 Gemini；所有请求通过 API client；用 VITE_API_BASE_URL 切换 mock/real。
交付物：重构后的前端可在 mock-server 下完成关键流程验收；最小 E2E 跑 mock。
```

## Backend Track（后端独立）任务

> 推荐把下面整段直接复制给“后端 Claude CLI”，作为它的工作清单。

### BE-1 建立 FastAPI 骨架与 health

输入：
- OpenAPI servers/paths

产出：
- `GET /health` 返回 200 JSON
- 基础 CORS/配置加载（Key 仅后端持有）

验收：
- 本地可启动，health 可访问

### BE-2 按契约实现 endpoints（先占位成功）

输入：
- [openapi.yaml](file:///Users/gude/codeup/Phantom-Lantern/shared/openapi/openapi.yaml)

产出：
- plan/image/batch/export endpoints 全部存在
- 先返回占位成功响应也可（用于先打通联调）

验收：
- curl 调用每个 endpoint 都有符合 schema 的响应

### BE-3 统一错误封装与错误码映射

输入：
- OpenAPI `ErrorEnvelope/ErrorCode`

产出：
- 全局异常处理：任何 4xx/5xx 输出统一 envelope
- requestId 回传（便于排障）

验收：
- 随机制造一个异常，返回格式仍符合 ErrorEnvelope

### BE-4 Gemini Service 封装（实现逻辑）

输入：
- 现有前端 prompt 与行为参考（可从 src/services/api/gemini.ts 迁移思路）

产出：
- plan：结构化 JSON slides（解析健壮）
- image：返回 imageBase64（data URL 或 base64）
- batch：可先串行，后续再并发/限流

验收：
- 单元测试 mock Gemini 覆盖解析与错误映射

### BE-5 导出服务（PPTX/PDF）

输入：
- ExportRequest/Response schema

产出：
- export endpoints 返回可下载的 fileUrl（最小可行：本地临时文件 + 静态目录挂载）

验收：
- 导出后可以下载文件；失败返回 ErrorEnvelope

### BE-6 可选真实 Gemini 冒烟（发布前闸门）

输入：
- 环境变量开关（例如 RUN_GEMINI_INTEGRATION_TESTS=1）

产出：
- 1-2 个最小冒烟用例

验收：
- 证明真实端到端能力存在，但默认不阻塞开发/CI

### 复制给“后端 Claude CLI”的任务描述

```
你负责 Backend Track：用 Python/FastAPI 实现 openapi.yaml 定义的 API。
硬约束：OpenAPI 为单一真相；统一 ErrorEnvelope；Gemini Key 仅在后端；默认单元测试 mock Gemini；真实 Gemini 冒烟用例可选且有开关。
交付物：后端可独立启动并通过自测；返回字段与错误格式稳定。
```

## Integration Track（集成/回切真实后端）任务

### INT-1 只通过配置切换 mock ↔ real

输入：
- 前端的 baseURL 读取方式（`VITE_API_BASE_URL`）

产出：
- 两套运行配置：
  - mock：`http://localhost:3001`
  - real：`http://localhost:8000`

验收：
- 不改业务代码即可切换数据源

### INT-2 差异清零（最常见阻塞点）

检查清单：
- 字段命名与大小写（camelCase）
- 枚举值一致（aspectRatio/imageSize）
- 错误格式一致（ErrorEnvelope）
- batch 返回结构一致

验收：
- 前端在 real backend 下无任何“兼容分支”即可跑通关键路径

### INT-3 最小集成测试

产出：
- 关键路径：输入→plan→image/batch→export
- 一个失败路径：image/batch 失败→展示错误→重试

验收：
- 集成测试默认不依赖真实 Gemini；发布前再跑真实冒烟
