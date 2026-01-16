# 重构计划评审报告（v1）

> 评审日期：2026-01-15
> 评审范围：`docs/refactoring-plan/` 目录下所有文档
> 评审目标：评估前后端并行重构计划的可行性与合理性

---

## 一、整体评价

**评分：8/10 - 计划整体质量较高，可行性强**

这套重构计划设计得相当专业，思路清晰，特别是在"并行解耦"这个核心目标上做得很好。文档层次分明，从顶层架构到具体任务都有覆盖。

---

## 二、优点

### 1. 契约先行策略非常正确

- OpenAPI 作为单一真相来源，前后端各自对齐契约
- `shared/openapi/openapi.yaml` 已经落地，schema 定义完整
- 错误格式统一（`ErrorEnvelope`），错误码枚举清晰

### 2. Mock 驱动开发思路清晰

- mock-server 已初步实现，fixtures 也有
- 前端可完全不依赖后端进度独立验收
- batch 接口的 mock 故意包含一个失败示例，便于验证错误处理

### 3. 任务拆分合理

- Track 划分清晰：Shared → Frontend → Backend → Integration
- 每个 Task 都有明确的输入、产出、验收标准（DoD）
- 提供了可直接复制给 Claude 的 prompt，降低执行门槛

### 4. 测试策略务实

- 闸门 A/B 的设计很好：A 稳定（mock），B 可选（真实 Gemini）
- 明确"不要做大而全的 E2E"，控制测试成本

---

## 三、需要补充或明确的问题

### 问题 1：前端重构起点需要进一步明确

**现状**：
- 文档提到"以 `src/` 为主线重构"
- 但 `src/` 目录下的模块化代码目前**未被入口引用**
- `index.tsx` 是独立的单文件实现，与 `src/` 并存

**风险**：执行时可能产生困惑——到底改哪套代码？

**建议**：

在 FE-0 任务中增加一个子任务：**明确切换时机与切换方式**

可选方案：

| 方案 | 描述 | 优点 | 缺点 |
|------|------|------|------|
| A | 在 `src/` 完成重构，最后替换入口 | 不影响现有可运行版本 | 两套代码并存期间维护成本高 |
| B | 直接在 index.tsx 上渐进重构 | 始终只有一套代码 | 重构期间可能频繁 break |

**推荐**：方案 A，但需要在任务清单中明确"何时切换入口"的里程碑。

---

### 问题 2：API Client 层的位置不明确

**现状**：
- `src/services/api/gemini.ts` 目前是直连 Gemini SDK
- 重构后需要改为调 HTTP API
- 文档没有明确新的 API client 放在哪、如何与现有 gemini.ts 共存

**建议**：

```
src/services/api/
  client.ts      # 新增：HTTP API client（baseURL 可配置）
  gemini.ts      # 保留：直连模式 fallback（feature flag 控制）
  index.ts       # 统一导出
```

在 FE-2 任务中补充这个文件路径约定。

---

### 问题 3：类型生成自动化缺失

**现状**：
- 文档提到"从 OpenAPI 生成 TS types"
- 实际上目前没有配置 `openapi-typescript` 或类似工具
- `src/types/api.ts` 是手写的

**建议**：

在 Shared 任务中增加 **S-0：配置类型生成脚本**

```bash
# scripts/generate-types.sh
npx openapi-typescript shared/openapi/openapi.yaml -o src/types/api.generated.ts
```

或在 `package.json` 中添加：

```json
{
  "scripts": {
    "generate-types": "openapi-typescript shared/openapi/openapi.yaml -o src/types/api.generated.ts"
  }
}
```

---

### 问题 4：后端技术选型细节不够

**现状**：
- BE 任务只说"建议 FastAPI + Uvicorn"
- 没有提到 Python 版本要求
- 依赖管理方式（Poetry）只在 ops-manual 提了一句
- 项目结构约定缺失

**建议**：

在 BE-0 中增加项目骨架结构约定：

```
backend/
  app/
    __init__.py
    main.py           # FastAPI 入口
    routes/           # 路由层
      presentations.py
      health.py
    services/         # 业务逻辑层
      gemini.py
      export.py
    schemas/          # Pydantic models
      requests.py
      responses.py
      errors.py
  tests/
    unit/
    integration/
  pyproject.toml      # Poetry 配置
  .env.example
```

补充技术要求：
- Python >= 3.11
- 依赖管理：Poetry
- ASGI Server：Uvicorn

---

### 问题 5：导出功能的责任归属不明确

**现状**：
- 当前前端用 `pptxgenjs` 和 `jsPDF` 在浏览器端生成文件
- OpenAPI 定义了 `POST /export/pptx` 和 `POST /export/pdf`
- 但没有明确：后端是否真的要实现文件生成？

**两种可能的设计**：

| 方案 | 后端职责 | 前端职责 | 优点 | 缺点 |
|------|----------|----------|------|------|
| A | 生成 PPTX/PDF 文件 | 下载文件 | 前端轻量 | 后端需要 python-pptx/reportlab |
| B | 只返回 slides 数据 | 用 pptxgenjs/jsPDF 生成 | 复用现有前端代码 | 导出逻辑分散 |

**建议**：

- 如果选方案 A：BE-4 需要补充 Python PPTX/PDF 库选型（推荐 `python-pptx` + `reportlab`）
- 如果选方案 B：需要调整 OpenAPI 设计，export 接口可能不需要

**推荐**：方案 A（后端生成），理由是：
1. 与"Gemini Key 只在后端"的安全策略一致
2. 未来可支持更复杂的导出需求（如服务端批量导出）

---

### 问题 6：缺少回滚/降级策略

**现状**：
- 文档没有提到：如果后端不可用，前端是否能回退到直连 Gemini？

**建议**：

考虑保留一个降级开关：

```bash
# .env.development
VITE_API_BASE_URL=http://localhost:3001
VITE_FALLBACK_TO_DIRECT_GEMINI=false  # 新增
```

在集成阶段验证："后端挂了"时前端的表现（至少应该有友好的错误提示）。

---

### 问题 7：fixtures 目录不完整

**现状**：
- `shared/fixtures/README.md` 只是描述
- 实际 json 文件（`plan.success.json` 等）似乎还没创建

**建议**：

S-3 任务验收标准应改为：

> fixtures json 文件已存在且可被 mock-server 引用

需要创建的文件：

```
shared/fixtures/
  plan.success.json
  image.success.json
  batch.partial-success.json
  error.ai_generation_failed.json
  error.validation.json
```

---

### 问题 8：worktree 策略与当前仓库结构不匹配

**现状**：
- `parallel-architecture.md` 推荐用 git worktree 分出 `frontend/`、`backend/`
- `parallel-refactor-v2.md` 说"先在当前仓库内落地"
- 两份文档存在矛盾

**建议**：

统一为一种策略，**推荐直接在当前仓库内落地**（更简单）。

最终目录结构：

```
Phantom-Lantern/
  index.tsx           # 旧入口，重构完成后删除
  src/                # 前端主代码
  backend/            # Python FastAPI（新增）
  mock-server/        # 已存在
  shared/             # 已存在
    openapi/
    fixtures/
  docs/
    refactoring-plan/
    review/           # 评审文档（本文件所在目录）
```

---

## 四、小问题

| 问题 | 位置 | 建议 |
|------|------|------|
| 命名不一致 | mock-server 用 `delayMs`，文档示例用 `delay` | 统一为 `delayMs` |
| 端口约定分散 | 只在 OpenAPI servers 里写了 | 在根目录 README 也写清楚 |
| CORS 配置不具体 | BE-0 只说"配置 CORS" | 给出具体 origins 列表 |

CORS 建议配置：

```python
# backend/app/main.py
origins = [
    "http://localhost:3000",   # Vite 默认
    "http://localhost:5173",   # Vite 新版默认
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
]
```

---

## 五、任务优先级建议

根据依赖关系，建议调整执行顺序：

### 第一阶段：基础设施（阻塞后续所有工作）

1. **S-0**（新增）：配置类型生成脚本
2. **S-1**：固化共享物与目录规范
3. **S-3**：补齐 fixtures json 文件
4. **S-4**：确保 mock-server 能稳定返回 fixtures

### 第二阶段：前后端可并行

**前端线**：
- FE-1：选定重构主线
- FE-2：落地 API Client
- FE-3：mock 驱动开发闭环

**后端线**：
- BE-0：FastAPI 骨架 + health
- BE-1：按契约实现 endpoints（先占位）
- BE-2：统一错误处理

### 第三阶段：核心功能

**前端线**：
- FE-4：UI/UX 重构

**后端线**：
- BE-3：Gemini Service 封装
- BE-4：导出服务

### 第四阶段：集成

- INT-1 → INT-2 → INT-3 → INT-4

---

## 六、总结

### 需要补充的内容（按优先级）

| 优先级 | 补充项 | 建议负责方 |
|--------|--------|------------|
| **高** | 明确前端重构切换策略（src/ vs index.tsx） | 前端 |
| **高** | 补齐 fixtures json 文件 | Shared |
| **中** | 明确导出功能的责任归属（前端/后端） | 架构决策 |
| **中** | 补充后端项目结构约定 | 后端 |
| **中** | 配置类型自动生成脚本 | Shared |
| **低** | 统一 worktree vs 单仓库策略 | 文档 |
| **低** | 补充 CORS 具体配置 | 后端 |

### 结论

如果上述问题在执行前能确定，整套重构计划就可以直接跑起来了。

建议在正式开工前，先开一个简短的对齐会议（或文档确认），把"高优先级"的 3 个问题敲定。
