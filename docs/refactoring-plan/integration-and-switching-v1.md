# 前后端集成与“回切真实后端接口”任务清单（v1）

## 目标

当“前端重构（跑 mock）”与“后端重构（自测通过）”分别完成后，提供一条低风险的集成路径：

- 只通过配置切换 mock/真实后端，不通过改业务代码切换。
- 集成测试覆盖关键路径，避免把“真实 Gemini”作为日常阻塞项。
- 导出责任归属以 ADR 为准（后端生成文件，前端下载）：[export-responsibility-v1.md](file:///Users/gude/codeup/Phantom-Lantern/docs/adr/export-responsibility-v1.md)

## 集成前置条件（硬闸门）

### Gate A：契约一致

- `shared/openapi/openapi.yaml` 是双方对齐的单一真相。
- 前端请求字段、后端响应字段、错误 envelope 都与契约一致。

### Gate B：双方独立验收已通过

- 前端：在 mock-server 上关键流程可跑通并通过 E2E（或至少可演示）。
- 后端：接口自测通过（单元测试为主），并能返回占位成功响应。

## 集成任务列表

### INT-1：环境切换标准化（配置化）

任务：

- 统一一套配置约定：
  - `VITE_API_BASE_URL=http://localhost:3001`（mock）
  - `VITE_API_BASE_URL=http://localhost:8000`（real backend）
- 确保前端所有请求都从同一个 baseURL 出口走。

验收：

- 不改业务代码即可完成 mock ↔ real 的切换。

### INT-2：契约与实现的差异清零（最容易卡住并行的点）

任务：

- 逐条对照以下最常见差异并清零：
  - 字段命名（camelCase vs snake_case）
  - 枚举值（例如 aspectRatio/imageSize）
  - 错误格式（后端默认错误页/字符串 vs ErrorEnvelope）
  - batch 接口的返回结构（slides 列表）

验收：

- 前端在 real backend 上跑关键路径时，不需要写任何“兼容分支”。

### INT-3：集成测试（关键路径优先）

推荐只做关键路径（与 mock E2E 同构）：

- 输入 → plan → 生成图片（单张或批量）→ 导出
- 一个失败场景：图片生成失败，前端能展示错误并可重试

原则：

- 集成测试默认不启用真实 Gemini（可通过后端开关改为 stub 或 mock）
- 发布前再跑少量真实 Gemini 冒烟

### INT-4：真实 Gemini 冒烟（可选，发布前闸门）

任务：

- 后端提供环境变量开关启用真实 Gemini。
- 冒烟用例只跑 1-2 个场景，控制成本与不稳定性。

验收：

- 能稳定证明“真实端到端能力存在”，但不要求每次开发都跑。

## 常见集成故障与快速定位

- 前端报 404：检查 `VITE_API_BASE_URL`、path 是否匹配 OpenAPI。
- 前端报 CORS：后端 CORS origins 未包含前端 dev 地址。
- 前端解析失败：后端返回了非 JSON（多见于异常未统一封装）。
- 图片显示异常：检查 `imageBase64` 是否为 data URL，或前端是否接受纯 base64。
