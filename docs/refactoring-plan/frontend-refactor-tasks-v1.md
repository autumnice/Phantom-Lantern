# 前端独立重构任务清单（v1）

## 适用范围与目标

适用于“前端先独立重构 + 全程走 mock-server + 前端自测通过后再切回真实后端”的并行开发模式。

目标：

- 前端开发期间不依赖后端进度（只依赖 `shared/openapi/openapi.yaml` 与 `mock-server/`）。
- 能完成 UI/UX 大改、性能优化、工程化升级，同时保持关键业务流程可验收。

依赖（唯一共享物）：

- API 契约：[openapi.yaml](file:///Users/gude/codeup/Phantom-Lantern/shared/openapi/openapi.yaml)
- Mock 服务与 fixtures：[mock-server](file:///Users/gude/codeup/Phantom-Lantern/mock-server) / [shared/fixtures](file:///Users/gude/codeup/Phantom-Lantern/shared/fixtures/README.md)

## 并行边界（前端侧必须遵守）

- 不在浏览器侧持有/使用 Gemini API Key（重构过程中逐步移除“直连 Gemini”路径）。
- 前端只通过 HTTP API 获取 plan/image/export 结果（mock 或真实后端）。
- 所有接口字段与错误格式以 OpenAPI 为准，不手写漂移。
- 导出责任归属以 ADR 为准（后端生成文件，前端下载）：[export-responsibility-v1.md](file:///Users/gude/codeup/Phantom-Lantern/docs/adr/export-responsibility-v1.md)
- 前端重构主线选择以 ADR 为准（方案 A：以 src 为主线，最后切入口）：[frontend-refactor-mainline-v1.md](file:///Users/gude/codeup/Phantom-Lantern/docs/adr/frontend-refactor-mainline-v1.md)

## 任务列表（按推荐顺序）

### FE-0：确定重构基线与切换策略

任务：

- 明确重构主线与入口切换策略：以 ADR 为准（无需再二选一）。  
  [frontend-refactor-mainline-v1.md](file:///Users/gude/codeup/Phantom-Lantern/docs/adr/frontend-refactor-mainline-v1.md)
- 定义一条最小“可运行路径”：输入 → 生成大纲 → 生成图片 → 导出。
- 定义环境切换方式：`VITE_API_BASE_URL=mock` 与 `VITE_API_BASE_URL=real`（只通过配置切换，不改业务代码）。

验收：

- 有一份简短说明写在本文件或 PR 描述中：采用哪套代码作为主线、切换策略是什么。

### FE-1：API Client 分层与类型对齐（契约驱动）

任务：

- 新增/统一 `api client` 层（位置约定如下）：
  ```
  src/services/api/
    client.ts      # HTTP API client（baseURL 可配置）
    gemini.ts      # 直连模式 fallback（feature flag 控制）
    index.ts       # 统一导出
  ```
  只暴露 `generatePlan / generateImage / generateImagesBatch / exportPptx / exportPdf / health`。
- 错误处理统一：把后端/Mock 的 `ErrorEnvelope` 解析成前端可用的错误对象。
- 类型来源统一：以 OpenAPI 生成 types（或至少手动对齐到 `shared/openapi/openapi.yaml`，后续再自动化）。

验收：

- 前端可以在不改 UI 的情况下，把所有数据请求替换为调用 `api client`（mock 返回能跑通）。
- 任何接口变更必须先改 OpenAPI（或至少同步修改契约文件）。

### FE-2：Mock 驱动开发闭环（不等后端）

任务：

- 把前端开发/测试默认跑在 mock-server 上（只改配置，不改业务逻辑）。
- 增加至少 1 个“失败场景”的 UI 处理（mock 中已有 batch 失败示例）。

验收：

- 纯前端环境下可完成关键流程验收（不需要启动 python 后端）。
- 错误态可视化：用户知道哪里失败、是否可重试。

### FE-3：UI/UX 重构（允许大改）

任务：

- 重构组件拆分、布局、交互与视觉风格（可以推翻当前风格）。
- 将全局状态/副作用集中（Context/hooks/service 分层），避免业务散落在 UI 组件中。

验收：

- 在 mock-server 下，关键流程仍可跑通并可演示。
- 状态流清晰：每一步有明确 loading/disable/error 反馈。

### FE-4：性能优化（以可度量项为主）

任务（择优做，不要求全做）：

- 图片渲染优化：避免大 base64 反复拷贝、避免不必要的 re-render。
- 计算/解析优化：大纲编辑、导出准备等计算用 memo/worker（按需）。
- 代码分割与懒加载：把非关键步骤延迟加载。

验收：

- 明确列出做了哪些优化点，至少能解释“为什么会更快/更省内存”。
- 不引入影响功能正确性的缓存错误。

### FE-5：测试（不阻塞交付的最小集合）

任务：

- 只做关键路径 E2E（跑 mock-server），避免真实网络与真实 Gemini。
- 组件/单测只测纯函数与关键 UI 组件（可选）。

验收：

- E2E 能在本地稳定跑过（失败率可接受），覆盖关键流程。

参考策略文档：[testing-and-mock-v1.md](file:///Users/gude/codeup/Phantom-Lantern/docs/refactoring-plan/testing-and-mock-v1.md)

### FE-6：回切真实后端（集成前置，最后再做）

任务：

- 保证只通过 `VITE_API_BASE_URL` 切换 mock/真实后端。
- 增加“健康检查/环境提示”，避免误连导致难排查。

验收：

- 不改业务代码即可从 mock 切到真实后端；功能一致，仅数据来源不同。
