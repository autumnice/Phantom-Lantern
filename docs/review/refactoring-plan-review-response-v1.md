# 对评审报告的回应（v1）

评审对象：[refactoring-plan-review-v1.md](file:///Users/gude/codeup/Phantom-Lantern/docs/review/refactoring-plan-review-v1.md)

## 结论

评审的大方向判断基本正确；其中有少量建议已被仓库的最新落地工作覆盖（属于“已过时”），也有一些建议值得补齐到文档里（我已同步补齐）。

## 逐条核对（正确性与处理结果）

### 问题 1：前端重构起点需要进一步明确

- 结论：正确
- 现状：仓库确实存在 `index.tsx`（单文件）与 `src/`（模块化）并存，容易让执行者困惑
- 处理：已在前端任务与可执行任务中补充“方案 A/B 二选一写清楚切换策略”
  - [frontend-refactor-tasks-v1.md](file:///Users/gude/codeup/Phantom-Lantern/docs/refactoring-plan/frontend-refactor-tasks-v1.md)
  - [executable-tasks-v1.md](file:///Users/gude/codeup/Phantom-Lantern/docs/refactoring-plan/executable-tasks-v1.md)

### 问题 2：API Client 层的位置不明确

- 结论：正确
- 处理：已把推荐目录约定写入前端任务与可执行任务
  - [frontend-refactor-tasks-v1.md](file:///Users/gude/codeup/Phantom-Lantern/docs/refactoring-plan/frontend-refactor-tasks-v1.md)
  - [executable-tasks-v1.md](file:///Users/gude/codeup/Phantom-Lantern/docs/refactoring-plan/executable-tasks-v1.md)

### 问题 3：类型生成自动化缺失

- 结论：正确（当前仓库未落地自动生成脚本/依赖）
- 处理：新增 Shared 的 S-0 任务：明确类型生成方案（工具生成或阶段性手工对齐并注明后续补齐）
  - [executable-tasks-v1.md](file:///Users/gude/codeup/Phantom-Lantern/docs/refactoring-plan/executable-tasks-v1.md)

### 问题 4：后端技术选型细节不够

- 结论：正确
- 处理：已在后端任务 BE-0 增补 Python/Poetry/Uvicorn 约束与建议目录结构
  - [backend-refactor-tasks-v1.md](file:///Users/gude/codeup/Phantom-Lantern/docs/refactoring-plan/backend-refactor-tasks-v1.md)

### 问题 5：导出功能责任归属不明确

- 结论：部分正确
- 说明：OpenAPI 与后端任务当前默认的是“后端导出生成文件 + 返回 fileUrl”。与现有前端浏览器导出（pptxgenjs/jsPDF）存在设计分岔，需要在执行前定一个方向。
- 当前推荐：仍推荐后端导出（安全与可扩展性更一致），但这是架构决策点，应在集成前锁定。

### 问题 6：缺少回滚/降级策略

- 结论：部分正确
- 说明：为了并行解耦与安全，计划默认不建议回退到前端直连 Gemini；但需要“后端不可用时的用户体验策略”（清晰报错、可重试、环境提示）作为最低要求。
- 当前处理：集成文档与前端任务已强调“只通过配置切换 mock/real + 健康检查/环境提示”，不依赖直连降级。

### 问题 7：fixtures 目录不完整

- 结论：已过时
- 现状：仓库已落地 fixtures json 文件（plan/image/error），并可被 mock-server 直接使用
  - [shared/fixtures](file:///Users/gude/codeup/Phantom-Lantern/shared/fixtures/README.md)

### 问题 8：worktree 策略与当前仓库结构不匹配

- 结论：正确
- 处理：已在早期 worktree 草案文档头部加注释，明确以 v2 单仓库策略为准
  - [parallel-architecture.md](file:///Users/gude/codeup/Phantom-Lantern/docs/refactoring-plan/parallel-architecture.md)

### 小问题：delay vs delayMs

- 结论：正确
- 现状：mock-server 使用 `delayMs`，已将 v2 文档相关描述补充为 `delayMs`
  - [parallel-refactor-v2.md](file:///Users/gude/codeup/Phantom-Lantern/docs/refactoring-plan/parallel-refactor-v2.md)

