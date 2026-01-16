# 并行重构：测试与 Mock（v1 最小可行）

## 目标

- 前端能在没有后端的情况下完成关键流程验收（依赖 mock-server）。
- 后端能在没有前端的情况下完成逻辑自测（依赖单元测试 + mock Gemini）。
- 联调/发布前再跑少量“真实 Gemini 冒烟”，不让其成为日常阻塞。

## 测试闸门（推荐）

### 闸门 A（默认、稳定、应当随时可跑）

1. 契约文件存在且可被引用：`shared/openapi/openapi.yaml`
2. mock-server 可启动并返回 fixtures
3. 前端 E2E（跑 mock）通过：只覆盖关键路径

### 闸门 B（按需、可选、可能 flaky）

1. 后端真实 Gemini 冒烟测试（环境变量开关）
2. 只跑小样本用例，避免配额/成本不可控

## 前端（建议最小集合）

### E2E 用例（跑 mock-server）

- `输入 -> 生成大纲 -> 编辑 -> 生成图片（批量/单张） -> 导出`
- `图片生成失败 -> 展示错误 -> 重试/跳过`

原则：

- 不做“真实网络/真实 Gemini”E2E
- 只测关键路径，不做大而全

## Mock Server（建议最小集合）

当前 mock 设计：`mock-server/data/api-responses.json`

建议至少包含：

- plan 成功（带 2-3 张 slide）
- image 成功（固定占位 base64）
- batch image：至少 1 个成功 + 1 个失败（验证前端错误处理）
- export：返回固定 fileUrl（无需生成真实文件）

## 后端（建议最小集合）

### 单元测试（mock Gemini）

建议测试点：

- Prompt 拼装与参数校验
- Gemini 返回解析（尤其是 JSON/结构化内容解析的健壮性）
- 错误映射：能稳定返回统一 `ErrorEnvelope`（code/message/details/requestId）

### 可选集成测试（真实 Gemini）

启用方式建议：

- 通过环境变量 `RUN_GEMINI_INTEGRATION_TESTS=1` 开关
- CI 默认不启用；本地或发布流水线按需启用

