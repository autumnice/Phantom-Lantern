# NanoDeck AI 前后端分离重构计划

## 项目概述

将现有的单文件 React 应用重构为前后端分离架构：
- **前端**：基于现有 React + TypeScript 代码进行模块重构和优化
- **后端**：使用 Python + FastAPI 构建独立的 API 服务
- **隔离开发**：使用 Git Worktree 实现前后端独立发

## 技术栈选择

### 前端
- **框架**：React 19 + TypeScript
- **构建工具**：Vite
- **状态管理**：React Context + useReducer（保持现有方案）
- **UI 库**：Tailwind CSS
- **HTTP 客户端**：Axios

### 后端
- **框架**：FastAPI（现代、高性能、支持异步）
- **语言**：Python 3.11+
- **API 文档**：自动生成的 OpenAPI/Swagger
- **AI SDK**：Google GenAI Python SDK
- **环境管理**：Poetry

### 部署
- **容器化**：Docker + Docker Compose
- **进程管理**：Gunicorn + Uvicorn

## 项目结构

```
NanoDeck-AI/
├── frontend/                 # 前端代码（Git Worktree）
│   ├── src/
│   │   ├── components/       # React 组件
│   │   ├── hooks/           # 自定义 Hooks
│   │   ├── services/        # API 服务层
│   │   ├── types/           # TypeScript 类型定义
│   │   ├── constants/       # 常量配置
│   │   ├── utils/           # 工具函数
│   │   ├── context/         # React Context
│   │   └── App.tsx          # 主应用组件
│   ├── public/              # 静态资源
│   ├── package.json
│   ├── vite.config.ts
│   └── Dockerfile
│
├── backend/                 # 后端代码（Git Worktree）
   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py          # FastAPI 应用入口
│   │   ├── api/             # API 路由
│   │   │   ├── __init__.py
│   │   │   ├─ v1/          # API v1 版本
│   │   │   │   ├── __init__.py
│   │   │   │   ├── endpoints/
│   │   │   │   │   ├── __init__.py
│   │   │   │   │   ├── presentations.py
│   │   │   │   │   └── images.py
│   │   │   │   └── dependencies.py
│   │   │   └── deps.py      # API 依赖注入
│   │   ├── core/            # 核心配置
│   │   │   ├── __init__.py
│   │   │   ├── config.py    # 配置管理
│   │   │   └── security.py  # 安全相关
│   │   ├── services/        # 业务逻辑服务
│   │   │   ├── __init__.py
│   │   │   ├── gemini.py    # Gemini AI 服务
│   │   │   └── presentation.py # 演示文稿服务
│   │   ├── schemas/         # Pydantic 模型
│   │   │   ├── __init__.py
│   │   │   ├── presentation.py
│   │   │   └── image.py
│   │   ├── utils/           # 工具函数
│   │   │   ├── __init__.py
│   │   │   └── helpers.py
│   │   └── models/          # 数据库模型（如需）
│   │       └── __init__.py
│   ├── tests/               # 测试文件
│   │   ├── __init__.py
│   │   ├── test_api.py
│   │   └── test_services.py
│   ├── pyproject.toml       # Poetry 配置
│   ├── Dockerfile
│   └── .env.example
│
├── docker-compose.yml       # Docker Compose 配置
├── .gitignore
└── README.md
```

## 重构步骤

### 第一阶段：环境准备（并行执行）

#### 1.1 Git Worktree 设置
```bash
# 主仓库保持原样
# 创建前端 worktree
git worktree add ../nanodeck-frontend frontend

# 创建后端 worktree
git worktree add ../nanodeck-backend backend
```

#### 1.2 前端环境准备
- 初始化新的 React + TypeScript 项目
- 配置 Vite、Tailwind CSS
- 安装依赖：react, typescript, axios, etc.

#### 1.3 后端环境准备
- 初始化 Python 项目
- 配置 Poetry 依赖管理
- 安装依赖：fastapi, uvicorn, python-dotenv, google-generativeai

### 第二阶段：后端 API 开发

#### 2.1 核心配置
- 创建 FastAPI 应用实例
- 配置 CORS（允许前端跨域请求）
- 环境变量管（API Keys 等）
- 日志配置

#### 2.2 API 路由设计

**Presentation API** (`/api/v1/presentations`)
```typescript
// POST /api/v1/presentations/plan - 生成演示文稿大纲
Request: {
  content: string;
  slideCount: number;
  aspectRatio: string;
  stylePrompt: string;
  detailLevel: string;
  useSearch?: boolean;
}
Response: {
  slides: SlidePlan[];
}

// POST /api/v1/presentations/generate-image - 生成单张图片
Request: {
  prompt: string;
  aspectRatio: string;
  imageSize: string;
}
Response: {
  imageBase64: string;
}

// POST /api/v1/presentations/export/pptx - 导出 PPTX
Request: {
  slides: SlideImage[];
  aspectRatio: string;
}
Response: {
  fileUrl: string; // 下载链接
}

// POST /api/v1/presentations/export/pdf - 导出 PDF
Request: {
  slides: SlideImage[];
  aspectRatio: string;
}
Response: {
  fileUrl: string; // 下载链接
}
```

#### 2.3 服务层实现
- GeminiService：封装 Google Gemini API 调用
- PresentationService：业务逻辑处理
- ExportService：导出功能实现

#### 2.4 错误处理
- 全局异常处理器
- 自定义异常类
- API 错误响应标准化

#### 2.5 测试
- 单元测试（pytest）
- API 测试（TestClient）
- Mock Gemini API 调用

### 第三阶段：前端重构

#### 3.1 项目结构重构
将现有的单文件代码拆分为模块化结构：
- 按功能拆分组件
- 提取自定义 Hooks
- 创建 API 服务层

#### 3.2 API 集成
- 创建 API 客户端（Axios）
- 实现 API 服务：
  - `presentationService` - 演示文稿相关 API
  - `imageService` - 图片生成 API
  - `exportService` - 导出 API

#### 3.3 状态管理重构
- 保持现有的 Context + useReducer 方案
- 将 API 调用从组件移至自定义 Hooks
- 优化状态更新逻辑

#### 3.4 组件优化
- 按功能模块组织组件
- 提取公共组件（Button, Modal, Loading 等）
- 实现组件懒加载

#### 3.5 TypeScript 类型完善
- 为 API 响应定义接口
- 完善组件 Props 类型
- 添加必要的类型守卫

### 第四阶段：集成测试

#### 4.1 本地开发环境
- 配置 Docker Compose
- 同时启动前端和后端服务
- 设置热重载

#### 4.2 端到端测试
- 测试完整流程：输入 → 规划 → 生成 → 导出
- 验证各步骤数据流
- 错误场景测试

#### 4.3 性能优化
- API 响应优化
- 前端资源优化
- 图片加载优化

### 第五阶段：部署准备

#### 5.1 Docker 配置
- 前端 Dockerfile（多阶段构建）
- 后端 Dockerfile
- Docker Compose 生产配置

#### 5.2 环境配置
- 生产环境变量配置
- Nginx 反向代理配置
- SSL 证书配置

#### 5.3 CI/CD 准备
- GitHub Actions 工作流
- 自动化测试
- 自动化部署

## API 详细设计

### 1. 生成演示文稿大纲
```python
# POST /api/v1/presentations/plan

# Request Body
{
  "content": "用户输入的文本或 URL",
  "slideCount": 5,
  "aspectRatio": "16:9",
  "stylePrompt": "Professional business presentation style",
  "detailLevel": "标准",
  "useSearch": false
}

# Response
{
  "slides": [
    {
      "id": 1,
      "title": "幻灯片标题",
      "content": "幻灯片内容",
      "visualDescription": "图片描述（英文）"
    }
  ]
}
```

### 2. 生成图片
```python
# POST /api/v1/presentations/generate-image

# Request Body
{
  "prompt": "Image generation prompt",
  "aspectRatio": "16:9",
  "imageSize": "1K"
}

# Response
{
  "imageBase64": "data:image/png;base64,..."
}
```

### 3. 批量生成图片（可选）
```python
# POST /api/v1/presentations/generate-images

# Request Body
{
  "slides": [
    {
      "id": 1,
      "prompt": "Prompt for slide 1"
    }
  ],
  "aspectRatio": "16:9",
  "imageSize": "1K"
}

# Response
{
  "slides": [
    {
      "id": 1,
      "imageBase64": "data:image/png;base64,...",
      "status": "success"
    }
  ]
}
```

### 4. 导出 PPTX
```python
# POST /api/v1/presentations/export/pptx

# Request Body
{
  "slides": [
    {
      "id": 1,
      "title": "Slide title",
      "content": "Slide content",
      "imageBase64": "data:image/png;base64,..."
    }
  ],
  "aspectRatio": "16:9"
}

# Response
{
  "fileUrl": "/downloads/presentation.pptx"
}
```

### 5. 导出 PDF
```python
# POST /api/v1/presentations/export/pdf

# Request Body - 同 PPTX

# Response
{
  "fileUrl": "/downloads/presentation.pdf"
}
```

## 关键代码示例

### 后端：FastAPI 主应用
```python
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.endpoints import presentations

app = FastAPI(title="NanoDeck AI API", version="1.0.0")

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(presentations.router, prefix="/api/v1/presentations", tags=["presentations"])

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
```

### 前端：API 客户端
```typescript
import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const presentationApi = {
  generatePlan: async (data: GeneratePlanRequest) => {
    const response = await apiClient.post<GeneratePlanResponse>('/api/v1/presentations/plan', data);
    return response.data;
  },

  generateImage: async (data: GenerateImageRequest) => {
    const response = await apiClient.post<GenerateImageResponse>('/api/v1/presentations/generate-image', data);
    return response.data;
  },

  exportToPPTX: async (data: ExportRequest) => {
    const response = await apiClient.post<ExportResponse>('/api/v1/presentations/export/pptx', data);
    return response.data;
  },
};
```

### 前端：自定义 Hook
```typescript
import { useState, useCallback } from 'react';
import { presentationApi } from '../services/api';

export const usePresentation = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generatePlan = useCallback(async (config: InputConfig) => {
    setLoading(true);
    setError(null);

    try {
      const styleObj = config.selectedStyleId === 'custom'
        ? { name: '自定义', prompt: config.customStylePrompt }
        : STYLES.find(s => s.id === config.selectedStyleId) || STYLES[0];

      const response = await presentationApi.generatePlan({
        content: config.text,
        slideCount: config.slideCount,
        aspectRatio: config.aspectRatio,
        stylePrompt: styleObj.prompt,
        detailLevel: config.detailLevelId,
        useSearch: false,
      });

      return response.slides;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { generatePlan, loading, error };
};
```

## 开发工作流

### 前端开发
```bash
# 在前端 worktree 目录
cd ../nanodeck-frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建
npm run build
```

### 后端开发
```bash
# 在后端 worktree 目录
cd ../nanodeck-backend

# 安装依赖
poetry install

# 启动开发服务器
poetry run uvicorn app.main:app --reload

# 运行测试
poetry run pytest
```

### 集成测试
```bash
# 在项目根目录
docker-compose up --build
```

## 优势

1. **独立开发**：前后端可以独立开发、测试和部署
2. **技术栈灵活**：前后端可以选择最适合的技术栈
3. **可扩展性**：后端可以独立扩展，支持更多客户端
4. **维护性**：代码结构清晰，易于维护和扩展
5. **团队协作**：前后端团队可以并行工作
6. **性能优化**：可以针对前后端分别进行性能优化

## 注意事项

1. **API 设计**：需要仔细设计 API 接口，确保满足前端需求
2. **错误处理**：需要统一错误处理机制
3. **认证授权**：如需用户系统，需实现 JWT 或 OAuth
4. **文件存储**：生成的文件需要考虑存储方案（本地或云存储）
5. **性能监控**：添加监控和日志记录
6. **安全性**：API 密钥等敏感信息需要妥善管理

## 时间估算

- **后端 API 开发**：3-5 天
- **前端重构**：5-7 天
- **集成测试**：2-3 天
- **部署配置**：1-2 天
- **总计**：约 2-3 周

这个计划可以根据实际需求进行调整，例如添加数据库支持、用户认证、文件存储等功能。