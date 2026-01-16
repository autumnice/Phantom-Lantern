# API 服务层

## 概述

本目录包含前端与后端交互的所有 API 服务代码。按照并行重构架构设计，前端不直连 Gemini，所有 AI 相关请求通过后端 API 完成。

## 文件结构

```
src/services/api/
├── client.ts     # HTTP API Client（主 API）
├── gemini.ts     # 直连模式 Fallback（开发/调试用）
├── index.ts      # 统一导出
└── README.md     # 本文档
```

## 核心 API Client (client.ts)

### 设计原则

1. **契约驱动**：所有类型定义对齐 `shared/openapi/openapi.yaml`
2. **环境切换**：通过 `VITE_API_BASE_URL` 环境变量切换 mock/real 后端
3. **统一错误处理**：所有错误转换为 `ApiError` 类，包含用户友好消息

### API 方法

| 方法 | 说明 | 超时 |
|------|------|------|
| `health()` | 健康检查 | 60s |
| `generatePlan(params)` | 生成演示计划 | 120s |
| `generateImage(params)` | 生成单张图片 | 180s |
| `generateImagesBatch(params)` | 批量生成图片 | 600s |
| `exportPptx(params)` | 导出 PPTX | 120s |
| `exportPdf(params)` | 导出 PDF | 120s |

### 使用示例

```typescript
import { apiClient, ApiError } from './services/api';

// 生成计划
try {
  const response = await apiClient.generatePlan({
    content: '用户输入内容',
    slideCount: 5,
    aspectRatio: '16:9',
    stylePrompt: 'minimal',
    detailLevel: 'normal',
  });
  console.log(response.slides);
} catch (error) {
  if (error instanceof ApiError) {
    console.error('API Error:', error.userMessage);
    if (error.isRetryable) {
      // 可重试
    }
  }
}
```

### 错误处理

`ApiError` 类提供：
- `code`: ErrorCode 枚举
- `message`: 原始错误消息
- `userMessage`: 用户友好的中文消息
- `isRetryable`: 是否可重试
- `status`: HTTP 状态码

## 环境配置

### Mock 环境（默认）
```bash
VITE_API_BASE_URL=http://localhost:3001
```

### 真实后端
```bash
VITE_API_BASE_URL=http://localhost:8000
```

## 注意事项

1. 前端不应直接持有 Gemini API Key
2. 所有 AI 相关请求必须通过 API Client
3. 导出功能由后端生成文件，前端只负责下载
