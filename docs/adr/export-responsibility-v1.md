# ADR: 导出功能责任归属（v1）

## 背景

当前仓库存在两条导出路径的可能性：

- 现状：前端在浏览器端用 `pptxgenjs` / `jsPDF` 生成文件
- 并行重构契约：OpenAPI 已定义 `POST /api/v1/presentations/export/pptx` 与 `POST /api/v1/presentations/export/pdf`，返回 `fileUrl`

评审提出需要明确“导出由前端负责还是后端负责”，否则前后端 AI 执行会产生歧义与返工。

## 决策

采用 **方案 A：后端负责生成 PPTX/PDF 文件，前端只负责触发与下载**。

即：

- 前端：提交导出请求（slides + aspectRatio 等），接收 `fileUrl` 并下载/预览
- 后端：生成文件并提供可下载地址；失败返回统一 `ErrorEnvelope`

## 选择理由

- **安全一致性**：Gemini Key 只在后端，导出放后端更符合“服务端集中处理敏感/重资源操作”的路线。
- **可扩展性**：未来可做批量导出、队列、缓存、存储（S3/GCS）、权限控制。
- **前端解耦**：前端重构时不需要关心导出实现细节，只要对齐契约与下载行为。

## 影响范围

### 契约（OpenAPI）

- `POST /api/v1/presentations/export/pptx`
- `POST /api/v1/presentations/export/pdf`
- 200 响应：`{ fileUrl: string }`
- 4xx/5xx：统一 `ErrorEnvelope`

契约来源：[openapi.yaml](file:///Users/gude/codeup/Phantom-Lantern/shared/openapi/openapi.yaml)

### 前端任务影响

- 前端导出逻辑应以“调用 export API + 下载 fileUrl”为主线
- 现有浏览器端导出实现可作为“历史实现/备选”，但不得作为默认方案（避免与契约冲突）

### 后端任务影响

后端必须实现：

- 文件生成（PPTX/PDF）
- 文件存储与下载（最小可行：本地目录 + 静态挂载）
- 错误封装（ErrorEnvelope）与 requestId

导出库选型（建议在 BE-4 落地时确定最终实现）：

- PPTX：优先考虑 `python-pptx`
- PDF：优先考虑 `reportlab`

## 备选方案（未采用）

方案 B：后端只返回 slides 数据，前端用 `pptxgenjs/jsPDF` 生成文件。

未采用原因：

- 导出逻辑分散在前端，后续扩展（批量、权限、存储）会更复杂
- 与“服务端集中处理”的总体安全路线不一致

## 验收标准（DoD）

- 前端调用导出接口后，可通过 `fileUrl` 下载到文件（mock 环境可返回固定 url）
- 后端在导出失败时返回统一 ErrorEnvelope（含明确 error.code）
