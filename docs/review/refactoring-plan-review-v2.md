# 重构计划评审报告（v2）

> 评审日期：2026-01-15
> 评审范围：`docs/refactoring-plan/` + `docs/adr/` + `shared/fixtures/`
> 对比基线：[refactoring-plan-review-v1.md](./refactoring-plan-review-v1.md)

---

## 一、整体评价

**评分：9.5/10 - 计划已接近可直接执行状态**

相比 v1 评审时的 8 分，本次修订版有显著提升。上一轮评审提出的 **高优先级问题已全部解决**，中优先级问题也大部分落地。整体文档结构更完整、AI 可执行性更强。

---

## 二、上轮问题修复情况

| 问题 | 优先级 | 状态 | 说明 |
|------|--------|------|------|
| 前端重构主线不明确 | 高 | ✅ 已解决 | 新增 ADR `frontend-refactor-mainline-v1.md`，明确"方案 A：以 src 为主线" |
| fixtures json 文件缺失 | 高 | ✅ 已解决 | 已创建 `plan.success.json`、`image.success.json`、`error.ai_generation_failed.json` |
| 导出功能责任归属不明确 | 中 | ✅ 已解决 | 新增 ADR `export-responsibility-v1.md`，明确"后端生成文件，前端下载" |
| 后端项目结构约定缺失 | 中 | ✅ 已解决 | `backend-refactor-tasks-v1.md` BE-0 已补充完整目录结构 |
| 类型生成自动化缺失 | 中 | ✅ 已解决 | `executable-tasks-v1.md` 新增 S-0 任务 |
| worktree vs 单仓库策略矛盾 | 低 | ✅ 已解决 | `parallel-refactor-v2.md` 统一为"单仓库优先" |
| API Client 位置不明确 | 中 | ✅ 已解决 | `frontend-refactor-tasks-v1.md` FE-1 已补充目录约定 |
| delay vs delayMs 命名不一致 | 低 | ✅ 已解决 | `parallel-refactor-v2.md` 已补充"支持 delay 与 delayMs" |

---

## 三、新增内容评价

### 3.1 ADR 目录 (`docs/adr/`)

**评价：优秀**

两份 ADR 文档结构清晰，包含：
- 背景与问题描述
- 决策内容
- 选择理由
- 影响范围
- 备选方案（未采用原因）
- 验收标准

这种格式非常适合 AI 执行——AI 可以直接以 ADR 为"约束输入"，减少歧义。

### 3.2 AI Coding Playbook (`ai-coding-playbook-v1.md`)

**评价：优秀，是本次修订的最大亮点**

这份文档补齐了"AI 可执行性"的关键缺失：

- **全局硬规则**：明确了唯一共享物、依赖新增规则、命名规则
- **OpenAPI 变更流程**：定义了契约变更的标准步骤，避免前后端漂移
- **任务卡模板**：提供了可复制的格式，AI 可直接按模板执行
- **AI 提示词模板**：前端/后端/契约变更三套模板，开箱即用
- **ADR 作为约束输入**：明确 AI 必须以 ADR 为准执行

### 3.3 fixtures 文件

**评价：合格，但可进一步完善**

已创建的 fixtures：
- `plan.success.json` ✅
- `image.success.json` ✅
- `error.ai_generation_failed.json` ✅

建议补充（非阻塞）：
- `batch.partial-success.json`（部分成功部分失败，用于验证前端错误处理）
- `error.validation.json`（400 参数校验错误示例）

---

## 四、仍需注意的小问题

### 4.1 后端 CORS 配置仍缺具体 origins

**现状**：BE-0 只说"配置 CORS（允许本地前端开发域）"，没有给出具体列表。

**建议**：在 BE-0 或 `ai-coding-playbook-v1.md` 中补充：

```python
# 建议 CORS origins
origins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
]
```

**影响**：低，不阻塞执行。

### 4.2 后端导出的 Python 库选型未明确

**现状**：ADR 决定了"后端负责生成 PPTX/PDF"，但未指定用什么库。

**建议**：在 BE-4 任务中补充推荐库：
- PPTX：`python-pptx`
- PDF：`reportlab` 或 `weasyprint`

**影响**：低，AI 可自行选择，但明确选型可减少返工。

### 4.3 回滚/降级策略仍缺失

**现状**：如果后端不可用，前端没有明确的降级方案。

**建议**：
- 考虑保留 `VITE_FALLBACK_TO_DIRECT_GEMINI=true` 开关
- 或在文档中明确"不提供降级，后端挂了就是挂了"

**影响**：低，属于运维层面考量。

### 4.4 根目录 README 未更新

**现状**：根目录 README 可能还没有反映新的项目结构和启动方式。

**建议**：在重构执行前，更新 README 包含：
- 新的目录结构说明
- mock-server / backend / frontend 的启动命令
- 端口约定（mock 3001、backend 8000、frontend 3000/5173）

**影响**：低，但对新人友好。

---

## 五、文档结构总览

更新后的文档结构清晰完整：

```
docs/
  refactoring-plan/
    parallel-refactor-v2.md      # 总览入口（已更新）
    executable-tasks-v1.md       # 可执行任务清单（已更新，新增 S-0）
    frontend-refactor-tasks-v1.md # 前端细化任务（已更新）
    backend-refactor-tasks-v1.md  # 后端细化任务（已更新，新增项目结构）
    integration-and-switching-v1.md # 集成任务（已更新）
    testing-and-mock-v1.md        # 测试策略
    ops-manual-v1.md              # 操作手册（已更新）
    ai-coding-playbook-v1.md      # 【新增】AI 执行规范
    parallel-architecture.md      # 架构参考（可归档）

  adr/
    frontend-refactor-mainline-v1.md  # 【新增】前端主线决策
    export-responsibility-v1.md       # 【新增】导出责任决策

  review/
    refactoring-plan-review-v1.md     # 第一轮评审
    refactoring-plan-review-v2.md     # 本文件

shared/
  openapi/
    openapi.yaml                 # API 契约
  fixtures/
    plan.success.json            # 【新增】
    image.success.json           # 【新增】
    error.ai_generation_failed.json # 【新增】
    README.md
```

---

## 六、执行建议

### 立即可开始的任务

重构计划已具备执行条件，可直接按以下顺序开工：

**第一步（并行）**：
- 前端 Claude：按 `ai-coding-playbook-v1.md` 的前端模板启动，从 FE-1 开始
- 后端 Claude：按 `ai-coding-playbook-v1.md` 的后端模板启动，从 BE-1 开始

**硬前置**：
- S-0（类型生成）可先手工对齐，后续补自动化
- S-1 ~ S-4 已基本就绪

### 推荐的执行顺序

```
Phase 1: 基础设施（1-2 小时）
├── S-0: 确认类型生成方式（手工 or 自动）
├── S-1: 确认共享物已就绪（OpenAPI + fixtures）✅ 已就绪
├── S-2: 确认错误码映射 ✅ OpenAPI 已定义
├── S-3: 确认 fixtures 完整 ✅ 基本完整
└── S-4: 确认 mock-server 可用 ✅ 已可用

Phase 2: 前后端并行
├── Frontend Track: FE-1 → FE-2 → FE-3 → FE-4 → FE-5
└── Backend Track: BE-1 → BE-2 → BE-3 → BE-4 → BE-5 → BE-6

Phase 3: 集成
└── INT-1 → INT-2 → INT-3 → INT-4
```

---

## 七、总结

### 本轮修订的主要改进

| 改进项 | 价值 |
|--------|------|
| 新增 ADR 目录 | 把架构决策固化为文档，减少 AI 执行歧义 |
| 新增 AI Coding Playbook | 提供任务卡模板、提示词模板、硬规则，大幅提升 AI 可执行性 |
| 补齐 fixtures | 前端 E2E 可稳定运行 |
| 统一目录约定 | 后端结构、前端 API client 位置都已明确 |
| 新增 S-0 任务 | 类型生成问题有了明确的处理方式 |

### 遗留小问题（不阻塞执行）

| 问题 | 建议处理时机 |
|------|--------------|
| CORS 具体 origins | BE-1 执行时补充 |
| 导出 Python 库选型 | BE-4 执行时确定 |
| 降级策略 | 集成阶段讨论 |
| README 更新 | 重构完成后统一更新 |
| batch fixtures | 前端 FE-2 执行时按需补充 |

### 结论

**重构计划已准备就绪，可以开始执行。**

建议立即启动两个 Claude CLI，分别按 `ai-coding-playbook-v1.md` 中的前端/后端模板开始工作。执行过程中遇到的小问题可边做边补充。
