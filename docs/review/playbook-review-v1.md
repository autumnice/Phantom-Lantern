# Playbook 评审报告（v1）

> 评审日期：2026-01-15
> 评审文件：`docs/playbooks/parallel-contract-mock-testing-playbook-v1.md`

---

## 一、整体评价

**评分：9/10 - 高质量的方法论沉淀，可直接复用**

这份文档很好地完成了"从项目经验到通用 Playbook"的抽象，具备以下特点：

- **定位清晰**：开篇明确"不属于任何具体项目"，是可复用的方法论模板
- **结构完整**：覆盖了并行开发的全流程（契约 → Mock → 测试 → 集成）
- **AI 友好**：包含任务卡模板和提示词模板，可直接复制使用
- **有落地示例**：第 8 节以 Phantom-Lantern 为例，展示了如何应用

---

## 二、优点

### 2.1 核心原则排序合理

六个原则按优先级排序：

1. 契约先行
2. Mock 优先
3. 测试闸门
4. 并行分轨
5. ADR 固化
6. 任务卡驱动

这个顺序反映了实际执行的依赖关系——契约是根基，Mock 是前端解耦的关键，后续才是流程管理。

### 2.2 四轨模型清晰实用

```
Shared → Frontend Track ↘
                         → Integration Track
         Backend Track  ↗
```

每个 Track 的职责边界定义得很清楚，特别是强调了"只通过配置切换，不通过改业务代码"。

### 2.3 契约变更流程是亮点

明确的四步流程：
1. 改契约
2. 改 fixtures
3. 改 mock-server
4. 改实现

加上"不得引入兼容分支"的验收标准，有效防止契约漂移。

### 2.4 测试闸门设计务实

Gate A（必须）vs Gate B（可选）的划分非常合理：
- Gate A 保证日常开发稳定、快速
- Gate B 只在发布前验证真实依赖

避免了"测试拖慢开发"的常见问题。

### 2.5 复用清单很贴心

第 9 节的"最小复制清单"非常实用：

```
1. shared/openapi/
2. shared/fixtures/
3. mock-server/
4. docs/playbooks/（本 Playbook）
5. docs/<project>/ai-coding-playbook.md
6. docs/adr/*.md
```

新项目可以直接按这个清单复制结构。

---

## 三、可改进的小问题

### 3.1 缺少"不适用场景"说明

**现状**：第 1 节只写了适用场景。

**建议**：补充不适用场景，例如：
- 极简单的单人项目（overhead 太高）
- 强实时交互的场景（如 WebSocket 双向通信，契约先行难度大）
- 探索性原型（需求不稳定，契约频繁变动）

### 3.2 fixtures 命名约定可更规范

**现状**：示例命名风格不完全统一（`plan.success.json` vs `error.<domain>.json`）

**建议**：统一为 `<resource>.<scenario>.json` 格式：
```
plan.success.json
plan.error-validation.json
image.success.json
image.error-generation-failed.json
batch.partial-success.json
```

### 3.3 版本管理策略未提及

**现状**：契约变更流程没有提到版本号管理。

**建议**：补充 API 版本策略建议：
- URL 路径版本（`/api/v1/`）vs Header 版本
- 破坏性变更如何处理（新版本 vs 兼容）

### 3.4 错误码设计原则可补充

**现状**：提到了错误格式规范，但没有给出错误码设计原则。

**建议**：补充错误码设计指南：
```
- 命名：大写下划线（VALIDATION_ERROR）
- 分类：按领域分组（AI_*、EXPORT_*、AUTH_*）
- HTTP 状态码映射原则
```

### 3.5 监控/可观测性未涉及

**现状**：文档聚焦开发阶段，未提及上线后的监控。

**建议**：可选补充：
- requestId 的使用与追踪
- 错误日志格式建议
- 指标埋点建议（延迟、成功率）

---

## 四、与项目文档的关系

这份 Playbook 与 `docs/refactoring-plan/` 下的文档形成了良好的层次关系：

| 层次 | 文件 | 作用 |
|------|------|------|
| **通用方法论** | `docs/playbooks/parallel-contract-mock-testing-playbook-v1.md` | 可复用的 Playbook |
| **项目执行规范** | `docs/refactoring-plan/ai-coding-playbook-v1.md` | 项目特定的 AI 执行规则 |
| **具体任务清单** | `docs/refactoring-plan/executable-tasks-v1.md` 等 | 可执行的任务卡 |
| **架构决策** | `docs/adr/*.md` | 关键决策的固化 |

这种分层很合理：
- Playbook 是"怎么做"的通用指南
- 项目文档是"这个项目具体怎么做"

---

## 五、总结

### 评价

这是一份**高质量的方法论沉淀**，完成度很高，可以直接在其他项目中复用。

### 建议改进（按优先级）

| 优先级 | 改进项 | 理由 |
|--------|--------|------|
| 低 | 补充不适用场景 | 帮助读者判断是否适用 |
| 低 | 统一 fixtures 命名约定 | 规范性 |
| 低 | 补充 API 版本策略 | 长期维护需要 |
| 可选 | 补充错误码设计原则 | 提升规范完整度 |
| 可选 | 补充监控/可观测性建议 | 延伸到运维阶段 |

### 结论

**Playbook 质量靠谱，可直接使用。** 上述建议都是锦上添花，不影响当前项目执行。

---

## 附：与重构计划的完整性检查

| Playbook 原则 | 项目落地情况 | 状态 |
|---------------|--------------|------|
| 契约先行 | `shared/openapi/openapi.yaml` | ✅ |
| Mock 优先 | `mock-server/` + fixtures | ✅ |
| 测试闸门 | `testing-and-mock-v1.md` Gate A/B | ✅ |
| 并行分轨 | `executable-tasks-v1.md` 四轨划分 | ✅ |
| ADR 固化 | `docs/adr/` 两份 ADR | ✅ |
| 任务卡驱动 | `ai-coding-playbook-v1.md` 模板 | ✅ |

**结论：Playbook 与项目文档完全对齐，方法论与落地一致。**
