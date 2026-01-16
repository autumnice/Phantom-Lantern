# 并行开发/重构通用 Playbook（契约先行 + Mock 优先 + 测试闸门）

本文件是对本次对话与仓库产出的“方法论总结 + 可复用规范模板”。它不属于任何具体项目的重构计划文档，可直接复制到其它新项目/重构任务中作为执行标准。

## 1. 适用场景

- 新项目：前后端分离、接口多、希望快速并行推进
- 重构项目：遗留代码耦合重、需要“边跑边换”、并行开发容易互相阻塞
- AI coding 场景：希望通过“文档即规范”降低歧义，让 AI 按文档稳定交付

## 1.2 不适用场景（或需要调整策略）

- 单体小需求：接口很少、单人即可在短周期内完成的改动（引入契约+mock+闸门的成本可能大于收益）
- 强实时联调：必须以真实硬件/真实三方系统为主线验收，且无法提供可用的模拟环境
- 契约不可控：接口由外部团队/供应商随时变更且无正式契约可跟随（需要先解决“单一真相源”）
- 合规限制：数据/网络策略禁止本地 mock 或 fixtures 存储任何样例数据（需要先定义脱敏与替代策略）

## 2. 核心原则（优先级从高到低）

1. **契约先行（Contract-First）**：接口契约是唯一真相，前后端只对齐契约，不对齐彼此实现。
2. **Mock 优先（Mock-First）**：前端默认对接 mock-server 完成验收；后端默认用 mock 外部依赖完成单测。
3. **测试闸门（Gate A/B）**：日常必须稳定通过 Gate A；真实外部依赖（如大模型）只作为 Gate B 的可选冒烟。
4. **并行分轨（Tracks）**：Shared / Frontend / Backend / Integration 四轨并行推进，依赖关系清晰、最小交叉。
5. **ADR 固化决策**：关键架构决策必须写 ADR，避免执行期反复讨论与返工。
6. **任务卡驱动**：每个任务都写清输入/输出/禁止项/验收标准（DoD），降低歧义并便于 AI 执行。

## 3. 四轨模型（推荐）

### 3.1 Shared Track（共享前置）

只产出“所有人都必须一致”的东西（共享物越少越好）：

- API 契约（OpenAPI/JSON Schema/GraphQL schema 等）
- fixtures（成功/失败/超时等示例响应）
- 错误格式规范（例如 ErrorEnvelope）
- 端口、环境变量、切换方式约定

### 3.2 Frontend Track（前端独立）

- 默认连接 mock-server 完成关键流程验收与 E2E
- 业务代码只依赖“API client + types”，不依赖后端实现细节

### 3.3 Backend Track（后端独立）

- 按契约实现接口
- 外部依赖（大模型、支付、三方 API）默认 mock 进行单元测试
- 可选做少量真实依赖冒烟（Gate B）

### 3.4 Integration Track（集成/回切）

- 当前后端各自通过 Gate A 后再联调
- 只通过配置切换 mock ↔ real，不通过改业务代码“临时兼容”来糊过去

## 4. 契约先行：你需要写清楚什么

### 4.1 契约应包含的最低信息

- endpoints / operations（含 operationId）
- request/response schemas（字段命名、枚举值、必填项）
- 错误格式（统一 envelope、error codes 集合）
- 超时/重试语义（由前端重试还是后端重试）

### 4.2 契约变更流程（强约束）

任何接口变更必须按这个顺序：

1. 修改契约文件
2. 同步 fixtures（至少 success + error）
3. 同步 mock-server 响应
4. 再改前端/后端实现

验收：前后端不得引入“兼容分支”来掩盖契约漂移。

### 4.3 API 版本策略（推荐）

- 单一真相：契约文件的 `info.version` 必须维护（至少包含主版本号）
- 破坏性变更：必须提升主版本（v1 → v2），并在路径中体现（例如 `/api/v2/...`）
- 非破坏性变更：允许同一主版本内演进（新增字段/新增可选字段/新增 endpoint），不得删除字段或改变字段语义
- 迁移期：允许 v1/v2 并存一段时间，但前端必须通过配置切换目标版本，不允许在业务代码里写“版本分支”
- 对外公开：优先使用 URL 版本（清晰、可缓存、易排障）；对内私有也建议采用相同方式以减少不确定性

## 5. Mock 优先：mock-server 与 fixtures 的最小标准

### 5.1 mock-server 最小能力

- 按 path/method 返回固定响应（来自 fixtures）
- 支持 `delayMs` 模拟耗时
- 支持返回成功与失败分支（让前端能验收错误处理）

### 5.2 fixtures 最小集合（建议）

- `plan.success.json`（或你的核心业务成功响应）
- `image.success.json`（如涉及二进制/图片，建议用 data URL base64 占位）
- `batch.partial-success.json`（如果有批量/并发流程）
- `error.validation.json`（400 校验错误示例）
- `error.<domain>.json`（业务错误示例，如 AI_GENERATION_FAILED）

结论：通常**不需要准备真实图片**；一个小的 base64 占位图足够支撑 UI/流程验收。

### 5.3 fixtures 命名约定（推荐）

- 总体格式：`<domain>.<variant>.json`
- `domain`：与契约 operation 或业务域对应（例如 plan / image / batch / export / error）
- `variant`：表达分支（例如 success / partial-success / validation / forbidden / not-found / timeout / rate-limited）
- 示例：
  - `plan.success.json`
  - `image.success.json`
  - `batch.partial-success.json`
  - `error.validation.json`
  - `error.ai-generation-failed.json`

## 6. 测试闸门：如何“测试优先但不拖慢交付”

### 6.1 Gate A（默认必须通过：稳定、快速、可重复）

- 契约一致（OpenAPI/fixtures/mock 三者一致）
- 前端关键路径 E2E（跑 mock-server）
- 后端单元测试（mock 外部依赖）

### 6.2 Gate B（可选：真实依赖冒烟）

- 仅在发布前/后端自测时启用
- 用环境变量开关（CI 默认不跑）
- 用例数量少，证明“真实端到端能力存在”即可

## 7. AI Coding 的沉淀方式（可复用）

### 7.1 固化为“AI 执行规范”

建议每个项目都有一个独立文件（不混入 plan），内容包括：

- 全局硬规则（禁止直连、禁止随意加依赖、字段命名规则）
- 契约变更流程
- ADR 作为约束输入的规则
- 任务卡模板
- 前端/后端提示词模板

### 7.2 任务卡模板（复制即用）

**Task ID**：S/FE/BE/INT-?  
**目标**：一句话可验收描述  
**输入**：契约/文档/现有入口  
**产出**：文件清单 + 行为变化  
**禁止项**：不能做什么（例如不得改契约、不得加依赖）  
**DoD**：验收点 + 必跑命令/步骤  
**风险/回滚**：如何降级、如何回退

### 7.3 提示词模板（复制即用）

前端：

```
你负责 Frontend Track：前端独立重构。
约束：只依赖契约与 mock；不直连外部依赖；只通过配置切换 mock/real；输出每个任务的文件变更与验收步骤。
执行依据：任务清单 + AI 执行规范 + ADR。
```

后端：

```
你负责 Backend Track：按契约实现 API。
约束：契约单一真相；统一错误格式；默认 mock 外部依赖做单测；真实冒烟可选且有开关；输出接口自测方式与错误码映射。
执行依据：任务清单 + AI 执行规范 + ADR。
```

## 8. 本次对话在 Phantom-Lantern 仓库的“落地清单”（示例）

### 8.1 契约与 fixtures

- 契约： [openapi.yaml](file:///Users/gude/codeup/Phantom-Lantern/shared/openapi/openapi.yaml)
- fixtures： [shared/fixtures](file:///Users/gude/codeup/Phantom-Lantern/shared/fixtures/README.md)

### 8.2 mock-server

- mock-server： [mock-server](file:///Users/gude/codeup/Phantom-Lantern/mock-server)
- mock 响应配置： [api-responses.json](file:///Users/gude/codeup/Phantom-Lantern/mock-server/data/api-responses.json)

### 8.3 测试与集成策略

- 测试闸门与策略： [testing-and-mock-v1.md](file:///Users/gude/codeup/Phantom-Lantern/docs/refactoring-plan/testing-and-mock-v1.md)
- 集成与回切： [integration-and-switching-v1.md](file:///Users/gude/codeup/Phantom-Lantern/docs/refactoring-plan/integration-and-switching-v1.md)

### 8.4 AI 执行规范与操作手册（项目内示例）

- 操作手册： [ops-manual-v1.md](file:///Users/gude/codeup/Phantom-Lantern/docs/refactoring-plan/ops-manual-v1.md)
- AI 执行规范： [ai-coding-playbook-v1.md](file:///Users/gude/codeup/Phantom-Lantern/docs/refactoring-plan/ai-coding-playbook-v1.md)

### 8.5 ADR（关键决策固化）

- 导出责任归属： [export-responsibility-v1.md](file:///Users/gude/codeup/Phantom-Lantern/docs/adr/export-responsibility-v1.md)
- 前端重构主线： [frontend-refactor-mainline-v1.md](file:///Users/gude/codeup/Phantom-Lantern/docs/adr/frontend-refactor-mainline-v1.md)

## 9. 如何在下一个项目复用（最小复制清单）

复制这 6 类文件/概念即可快速复用：

1. `shared/openapi/`（你的契约）
2. `shared/fixtures/`（你的最小 fixtures）
3. `mock-server/`（或等价 mock 方案）
4. `docs/playbooks/parallel-contract-mock-testing-playbook-v1.md`（本文件）
5. `docs/<your-folder>/ai-coding-playbook.md`（项目 AI 执行规范）
6. `docs/adr/*.md`（项目关键决策）
