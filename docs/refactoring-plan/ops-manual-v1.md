# 并行重构傻瓜式操作手册（v1）

你将同时跑两条“互不干扰”的开发线：

- 前端：先对接 mock-server，完成重构与自测
- 后端：独立实现 Python/FastAPI，按 OpenAPI 契约输出接口
- 最后：仅通过配置把前端从 mock 切到真实后端，跑最小集成测试

> 你不需要先改 `index.tsx`。前端重构完成后再做“回切真实后端”的最后一步即可。

## 0. 你需要准备什么（只做一次）

### 必装软件（小白版）

- Node.js（建议 18+ 或 20+）
- npm（随 Node 安装）
- Git
- Python（建议 3.11+）
- Poetry（后端依赖管理）

### 仓库中你会用到的文档（都已准备好）

- 并行对齐稿（总览入口）：[parallel-refactor-v2.md](file:///Users/gude/codeup/Phantom-Lantern/docs/refactoring-plan/parallel-refactor-v2.md)
- AI Coding 执行规范（减少歧义的硬规则与提示词模板）：[ai-coding-playbook-v1.md](file:///Users/gude/codeup/Phantom-Lantern/docs/refactoring-plan/ai-coding-playbook-v1.md)
- 可执行任务清单（给 Claude 复制用）：[executable-tasks-v1.md](file:///Users/gude/codeup/Phantom-Lantern/docs/refactoring-plan/executable-tasks-v1.md)
- 前端任务清单（更细）：[frontend-refactor-tasks-v1.md](file:///Users/gude/codeup/Phantom-Lantern/docs/refactoring-plan/frontend-refactor-tasks-v1.md)
- 后端任务清单（更细）：[backend-refactor-tasks-v1.md](file:///Users/gude/codeup/Phantom-Lantern/docs/refactoring-plan/backend-refactor-tasks-v1.md)
- 测试与 Mock 策略：[testing-and-mock-v1.md](file:///Users/gude/codeup/Phantom-Lantern/docs/refactoring-plan/testing-and-mock-v1.md)
- API 契约（唯一真相）：[openapi.yaml](file:///Users/gude/codeup/Phantom-Lantern/shared/openapi/openapi.yaml)

## 1. 第一天：先让“前端能独立跑通”（只依赖 mock）

### Step 1：启动 mock-server（终端 1）

在仓库根目录执行：

```bash
cd mock-server
npm install
npm run dev
```

看到类似输出即成功：

```
mock-server listening on http://localhost:3001
```

### Step 2：启动前端开发服务器（终端 2）

在仓库根目录执行：

```bash
npm install
npm run dev
```

说明：

- 当前前端还没有“默认走 mock”的改造，这一步只是确保你能正常跑起现有项目。
- 真正的前端重构会在“前端 Claude”里按任务清单推进；你可以让它把 API client 做成可配置 baseURL（`VITE_API_BASE_URL`），最终达到“只改配置切换 mock/真实后端”的目标。

## 2. 并行开工：同时启动两个 Claude / 两个 IDE

你将开两个窗口：

- 窗口 A：前端 Claude（只做前端）
- 窗口 B：后端 Claude（只做后端）

### Step 3：前端 Claude 怎么开工（建议提示词）

把下面整段复制给“前端 Claude”：

```
你负责 Frontend Track：前端独立重构，不依赖后端进度。
硬约束：
1) 只依赖 shared/openapi/openapi.yaml 与 mock-server；
2) 不直连 Gemini，不在浏览器侧使用 GEMINI_API_KEY；
3) 所有请求通过 API client，且只通过 VITE_API_BASE_URL 切换 mock/real；
4) E2E/验收默认跑 mock-server，不跑真实 Gemini。

请以 docs/refactoring-plan/executable-tasks-v1.md 的 Frontend Track 为主任务清单，
必要时参考 docs/refactoring-plan/frontend-refactor-tasks-v1.md。
另外请遵守 ADR：
- docs/adr/frontend-refactor-mainline-v1.md（以 src 为主线，最后切入口，冻结 index.tsx）
- docs/adr/export-responsibility-v1.md（导出后端生成文件，前端下载）
```

你也可以补一句你想要的风格方向（例如：赛博朋克/极简/Notion 风/高性能）。

### Step 4：后端 Claude 怎么开工（建议提示词）

把下面整段复制给“后端 Claude”：

```
你负责 Backend Track：用 Python/FastAPI 实现 shared/openapi/openapi.yaml 定义的 API。
硬约束：
1) OpenAPI 为单一真相；任何 API 变更先改契约；
2) 统一 ErrorEnvelope（error.code/message/details?/requestId?）；
3) Gemini Key 只存在后端；默认单元测试 mock Gemini；
4) 真实 Gemini 冒烟测试可选，必须有环境变量开关，且默认不跑。

请以 docs/refactoring-plan/executable-tasks-v1.md 的 Backend Track 为主任务清单，
必要时参考 docs/refactoring-plan/backend-refactor-tasks-v1.md 与 docs/refactoring-plan/testing-and-mock-v1.md。
```

## 3. 前端如何验收“完成了”（只跑 mock）

你在前端重构期间的验收原则：

- 只要在 mock-server 上能跑通：输入 → 大纲 → 图片（单张/批量）→ 导出，并且错误态可展示/可重试
- 就算后端还没写完，也算前端阶段性完成

你可以用这些 mock fixtures 辅助验证：

- mock 返回配置：[api-responses.json](file:///Users/gude/codeup/Phantom-Lantern/mock-server/data/api-responses.json)
- 统一示例响应：[shared/fixtures](file:///Users/gude/codeup/Phantom-Lantern/shared/fixtures/README.md)

## 4. 后端如何验收“完成了”（不依赖前端）

你在后端重构期间的验收原则：

- FastAPI 启动后，按 OpenAPI 的 endpoints 都能返回符合 schema 的 JSON
- 默认测试不依赖真实 Gemini（mock Gemini 覆盖解析与错误映射）
- 可选再跑一次真实 Gemini 冒烟（开关开启时）

## 5. 最后一步：前端“回切真实后端”并做最小集成测试

当前提满足：

- 前端在 mock 环境验收通过
- 后端 API 自测通过
- 契约一致（字段、枚举、错误格式）

你再按集成清单操作：

- [integration-and-switching-v1.md](file:///Users/gude/codeup/Phantom-Lantern/docs/refactoring-plan/integration-and-switching-v1.md)

核心原则：

- 只通过配置切换 `VITE_API_BASE_URL` 从 `http://localhost:3001` → `http://localhost:8000`
- 不允许靠“加兼容分支”糊过去（那会破坏并行解耦）

## 6. 常见问题（小白排障）

- mock-server 404：检查请求 path 是否与 OpenAPI/fixtures 一致（注意结尾 `/`）。
- 前端请求没走 mock：确认前端的 baseURL 是否真的取自 `VITE_API_BASE_URL`（这属于前端重构的一部分）。
- 后端返回不是 JSON：大概率是异常未统一封装为 ErrorEnvelope。
- 图片显示不了：确认 `imageBase64` 是否为 `data:image/...;base64,` 开头的 data URL（mock 已给占位图）。
