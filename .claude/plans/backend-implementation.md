# NanoDeck AI 后端独立重构计划 (Python)

## 项目概述

基于 FastAPI 框架构建独立的 Python 后端服务，提供 AI 驱动的演示文稿生成功能。

## 技术栈

- **框架**: FastAPI (异步高性能 Web 框架)
- **语言**: Python 3.11+
- **API 文档**: 自动生成的 OpenAPI/Swagger UI
- **AI SDK**: Google GenAI Python SDK
- **依赖管理**: Poetry
- **ASGI 服务器**: Uvicorn + Gunicorn
- **容器化**: Docker

## 项目结构

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI 应用入口
│   ├── api/
│   │   ├── __init__.py
│   │   └── v1/
│   │       ├── __init__.py
│   │       ├── endpoints/
│   │       │   ├── __init__.py
│   │       │   ├── presentations.py    # 演示文稿 API
│   │       │   └── images.py           # 图片生成 API
│   │       └── dependencies.py         # API 依赖注入
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py        # 配置管理
│   │   └── exceptions.py    # 自定义异常
│   ├── services/
│   │   ├── __init__.py
│   │   ├── gemini.py        # Gemini AI 服务
│   │   └── presentation.py  # 示文稿业务逻辑
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── presentation.py  # 演示文稿相关 Pydantic 模型
│   │   └── image.py         # 图片相关 Pydantic 模型
│   └── utils/
│       ├── __init__.py
│       └── helpers.py       # 工具函数
├── tests/
│   ├── __init__.py
│   ├── conftest.py          # pytest 配置
│   ├── test_api.py          # API 测试
│   └── test_services.py     # 服务层测试
├── pyproject.toml           # Poetry 依赖配置
├── Dockerfile               # Docker 镜像配置
├── .env.example            # 环境变量示例
└── README.md               # 后端项目文档
```

## 核心功能实现

### 1. 配置管理 (app/core/config.py)

```python
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # API 配置
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "NanoDeck AI API"

    # Gemini API
    GEMINI_API_KEY: str

    # CORS
    BACKEND_CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:5173"]

    # 导出配置
    EXPORT_DIR: str = "./exports"
    MAX_FILE_SIZE: int = 50 * 1024 * 1024  # 50MB

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
```

### 2. Pydantic 模型 (app/schemas/)

#### presentation.py
```python
from pydantic import BaseModel, Field
from typing import List, Optional
from enum import Enum


class AspectRatio(str, Enum):
    RATIO_16_9 = "16:9"
    RATIO_4_3 = "4:3"
    RATIO_1_1 = "1:1"
    RATIO_3_4 = "3:4"
    RATIO_9_16 = "9:16"


class ImageSize(str, Enum):
    SIZE_1K = "1K"
    SIZE_2K = "2K"
    SIZE_4K = "4K"


class SlidePlan(BaseModel):
    id: int = Field(..., description="幻灯片序号")
    title: str = Field(..., description="幻灯片标题")
    content: str = Field(..., description="幻灯片内容")
    visualDescription: str = Field(..., description="图片描述（英文）")


class GeneratePlanRequest(BaseModel):
    content: str = Field(..., description="用户输入的文本或 URL")
    slideCount: int = Field(default=5, ge=1, le=20, description="幻灯片数量")
    aspectRatio: AspectRatio = Field(default=AspectRatio.RATIO_16_9)
    stylePrompt: str = Field(..., description="风格提示词")
    detailLevel: str = Field(default="标准", description="详细程度")
    useSearch: bool = Field(default=False, description="是否使用搜索增强")


class GeneratePlanResponse(BaseModel):
    slides: List[SlidePlan]


class ExportRequest(BaseModel):
    slides: List[dict] = Field(..., description="包含图片的幻灯片数据")
    aspectRatio: AspectRatio


class ExportResponse(BaseModel):
    fileUrl: str = Field(..., description="下载链接")
```

#### image.py
```python
from pydantic import BaseModel, Field


class GenerateImageRequest(BaseModel):
    prompt: str = Field(..., description="图片生成提示词")
    aspectRatio: str = Field(..., description="宽高比")
    imageSize: str = Field(default="1K", description="图片尺寸")


class GenerateImageResponse(BaseModel):
    imageBase64: str = Field(..., description="Base64 编码的图片数据")


class BatchImageRequest(BaseModel):
    slides: list[dict] = Field(..., description="幻灯片列表")
    aspectRatio: str = Field(..., description="宽高比")
    imageSize: str = Field(default="1K", description="图片尺寸")


class BatchImageResponse(BaseModel):
    slides: list[dict] = Field(..., description="包含生成结果的幻灯片列表")
```

### 3. AI 服务层 (app/services/gemini.py)

```python
import google.generativeai as genai
from typing import List, Dict, Any
import json
import logging

from app.core.config import settings
from app.schemas.presentation import SlidePlan

logger = logging.getLogger(__name__)


class GeminiService:
    def __init__(self):
        genai.configure(api_key=settings.GEMINI_API_KEY)
        self.model = genai.GenerativeModel('gemini-1.5-pro-latest')
        self.image_model = genai.GenerativeModel('gemini-1.5-pro-latest')

    async def generate_presentation_plan(
        self,
        content: str,
        slide_count: int,
        aspect_ratio: str,
        style_prompt: str,
        detail_level: str,
        use_search: bool = False
    ) -> List[SlidePlan]:
        """生成演示文稿大纲"""

        prompt = f"""作为专业的演示文稿设计师，请根据以下内容创建 {slide_count} 张幻灯片的大纲。

内容：{content}

要求：
1. 每张幻灯片需要包含：
   - title: 幻灯片标题（简洁有力）
   - content: 幻灯片内容要点（使用 Markdown 格式，包含重点标记）
   - visualDescription: 配图的文字描述（英文，详细描述视觉元素）

2. 风格要求：{style_prompt}

3. 详细程度：{detail_level}

4. 宽高比：{aspect_ratio}

5. 内容要逻辑清晰，层层递进

请返回 JSON 格式，结构如下：
```json
{{
  "slides": [
    {{
      "id": 1,
      "title": "标题",
      "content": "内容",
      "visualDescription": "图片描述"
    }}
  ]
}}
```

只返回 JSON，不要其他解释。"""

        try:
            response = await self.model.generate_content_async(prompt)
            response_text = response.text

            # 提取 JSON 部分
            if "```json" in response_text:
                json_start = response_text.find("```json") + 7
                json_end = response_text.find("```", json_start)
                json_str = response_text[json_start:json_end].strip()
            else:
                json_str = response_text.strip()

            data = json.loads(json_str)

            # 转换为 SlidePlan 对象
            slides = []
            for i, slide_data in enumerate(data.get("slides", [])):
                slide = SlidePlan(
                    id=slide_data.get("id", i + 1),
                    title=slide_data.get("title", ""),
                    content=slide_data.get("content", ""),
                    visualDescription=slide_data.get("visualDescription", "")
                )
                slides.append(slide)

            return slides

        except Exception as e:
            logger.error(f"生成演示文稿计划失败: {str(e)}")
            raise Exception(f"AI 生成失败: {str(e)}")

    async def generate_image(
        self,
        prompt: str,
        aspect_ratio: str,
        image_size: str
    ) -> str:
        """生成图片"""

        # 映射尺寸
        size_map = {
            "1K": "1024x1024",
            "2K": "2048x2048",
            "4K": "4096x4096"
        }

        # 根据宽高比调整尺寸
        if aspect_ratio == "16:9":
            size = size_map.get(image_size, "1024x1024")
            width, height = size.split("x")
            height = str(int(int(width) * 9 / 16))
            size = f"{width}x{height}"
        elif aspect_ratio == "4:3":
            size = size_map.get(image_size, "1024x1024")
            width, height = size.split("x")
            height = str(int(int(width) * 3 / 4))
            size = f"{width}x{height}"
        else:
            size = size_map.get(image_size, "1024x1024")

        try:
            result = await self.image_model.generate_content_async(
                [prompt],
                generation_config={
                    "temperature": 0.7,
                }
            )

            # 这里需要处理实际的图片生成
            # 由于 Gemini API 的图片生成方式可能不同，需要根据实际情况调整
            # 暂时返回模拟数据
            return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="

        except Exception as e:
            logger.error(f"生成图片失败: {str(e)}")
            raise Exception(f"图片生成失败: {str(e)}")


# 单例实例
gemini_service = GeminiService()
```

### 4. 演示文稿服务 (app/services/presentation.py)

```python
import os
import base64
import tempfile
from pathlib import Path
from typing import List, Dict
import logging

from app.services.gemini import gemini_service
from app.schemas.presentation import (
    GeneratePlanRequest,
    SlidePlan,
    ExportRequest
)

logger = logging.getLogger(__name__)


class PresentationService:
    async def generate_plan(self, request: GeneratePlanRequest) -> List[SlidePlan]:
        """生成演示文稿大纲"""
        return await gemini_service.generate_presentation_plan(
            content=request.content,
            slide_count=request.slideCount,
            aspect_ratio=request.aspectRatio,
            style_prompt=request.stylePrompt,
            detail_level=request.detailLevel,
            use_search=request.useSearch
        )

    async def generate_image(
        self,
        prompt: str,
        aspect_ratio: str,
        image_size: str
    ) -> str:
        """生成单张图片"""
        return await gemini_service.generate_image(
            prompt=prompt,
            aspect_ratio=aspect_ratio,
            image_size=image_size
        )

    async def generate_images_batch(
        self,
        slides: List[Dict],
        aspect_ratio: str,
        image_size: str
    ) -> List[Dict]:
        """批量生成图片"""
        results = []

        for slide in slides:
            try:
                image_base64 = await self.generate_image(
                    prompt=slide.get("visualDescription", ""),
                    aspect_ratio=aspect_ratio,
                    image_size=image_size
                )
                results.append({
                    "id": slide.get("id"),
                    "imageBase64": image_base64,
                    "status": "success"
                })
            except Exception as e:
                logger.error(f"生成图片失败 (slide {slide.get('id')}): {str(e)}")
                results.append({
                    "id": slide.get("id"),
                    "imageBase64": None,
                    "status": "error",
                    "error": str(e)
                })

        return results

    async def export_pptx(self, request: ExportRequest) -> str:
        """导出 PPTX 文件"""
        # 这里需要实现 PPTX 导出逻辑
        # 可以使用 python-pptx 库
        # 暂时返回模拟的文件路径

        export_dir = Path("./exports")
        export_dir.mkdir(exist_ok=True)

        # 生成唯一文件名
        import uuid
        file_name = f"presentation_{uuid.uuid4()}.pptx"
        file_path = export_dir / file_name

        # TODO: 实现实际的 PPTX 生成
        # 创建空文件作为占位符
        file_path.touch()

        return f"/downloads/{file_name}"

    async def export_pdf(self, request: ExportRequest) -> str:
        """导出 PDF 文件"""
        # 这里需要实现 PDF 导出逻辑
        # 可以使用 reportlab 或 weasyprint
        # 暂时返回模拟的文件路径

        export_dir = Path("./exports")
        export_dir.mkdir(exist_ok=True)

        # 生成唯一文件名
        import uuid
        file_name = f"presentation_{uuid.uuid4()}.pdf"
        file_path = export_dir / file_name

        # TODO: 实现实际的 PDF 生成
        # 创建空文件作为占位符
        file_path.touch()

        return f"/downloads/{file_name}"


# 单例实例
presentation_service = PresentationService()
```

### 5. API 路由 (app/api/v1/endpoints/)

#### presentations.py
```python
from fastapi import APIRouter, HTTPException
from typing import List
import logging

from app.services.presentation import presentation_service
from app.schemas.presentation import (
    GeneratePlanRequest,
    GeneratePlanResponse,
    SlidePlan,
    ExportRequest,
    ExportResponse
)
from app.schemas.image import (
    GenerateImageRequest,
    GenerateImageResponse,
    BatchImageRequest,
    BatchImageResponse
)

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/plan", response_model=GeneratePlanResponse)
async def generate_presentation_plan(request: GeneratePlanRequest):
    """
    生成演示文稿大纲

    - **content**: 用户输入的文本或 URL
    - **slideCount**: 幻灯片数量 (1-20)
    - **aspectRatio**: 宽高比
    - **stylePrompt**: 风格提示词
    - **detailLevel**: 详细程度
    - **useSearch**: 是否使用搜索增强
    """
    try:
        slides = await presentation_service.generate_plan(request)
        return GeneratePlanResponse(slides=slides)
    except Exception as e:
        logger.error(f"生成演示文稿大纲失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate-image", response_model=GenerateImageResponse)
async def generate_image(request: GenerateImageRequest):
    """
    生成单张图片

    - **prompt**: 图片生成提示词
    - **aspectRatio**: 宽高比
    - **imageSize**: 图片尺寸 (1K/2K/4K)
    """
    try:
        image_base64 = await presentation_service.generate_image(
            prompt=request.prompt,
            aspect_ratio=request.aspectRatio,
            image_size=request.imageSize
        )
        return GenerateImageResponse(imageBase64=image_base64)
    except Exception as e:
        logger.error(f"生成图片失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate-images", response_model=BatchImageResponse)
async def generate_images_batch(request: BatchImageRequest):
    """
    批量生成图片

    - **slides**: 幻灯片列表（包含 visualDescription）
    - **aspectRatio**: 宽高比
    - **imageSize**: 图片尺寸
    """
    try:
        results = await presentation_service.generate_images_batch(
            slides=request.slides,
            aspect_ratio=request.aspectRatio,
            image_size=request.imageSize
        )
        return BatchImageResponse(slides=results)
    except Exception as e:
        logger.error(f"批量生成图片失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/export/pptx", response_model=ExportResponse)
async def export_pptx(request: ExportRequest):
    """
    导出 PPTX 文件

    - **slides**: 包含图片的幻灯片数据
    - **aspectRatio**: 宽高比
    """
    try:
        file_url = await presentation_service.export_pptx(request)
        return ExportResponse(fileUrl=file_url)
    except Exception as e:
        logger.error(f"导出 PPTX 失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/export/pdf", response_model=ExportResponse)
async def export_pdf(request: ExportRequest):
    """
    导出 PDF 文件

    - **slides**: 包含图片的幻灯片数据
    - **aspectRatio**: 宽高比
    """
    try:
        file_url = await presentation_service.export_pdf(request)
        return ExportResponse(fileUrl=file_url)
    except Exception as e:
        logger.error(f"导出 PDF 失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
```

### 6. 主应用 (app/main.py)

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
import logging

from app.core.config import settings
from app.api.v1.endpoints import presentations

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 创建 FastAPI 应用
app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    description="NanoDeck AI API - 智能演示文稿生成服务"
)

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(
    presentations.router,
    prefix=f"{settings.API_V1_STR}/presentations",
    tags=["presentations"]
)

# 静态文件服务（导出文件）
export_dir = Path("./exports")
export_dir.mkdir(exist_ok=True)
app.mount("/downloads", StaticFiles(directory=str(export_dir)), name="downloads")


@app.get("/health")
async def health_check():
    """健康检查接口"""
    return {"status": "healthy", "service": settings.PROJECT_NAME}


@app.get("/")
async def root():
    """根路径"""
    return {
        "message": "NanoDeck AI API",
        "docs": "/docs",
        "health": "/health"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

## 依赖配置 (pyproject.toml)

```toml
[tool.poetry]
name = "nanodeck-backend"
version = "1.0.0"
description = "NanoDeck AI Backend API"
authors = ["Your Name <your.email@example.com>"]
readme = "README.md"
packages = [{include = "app"}]

[tool.poetry.dependencies]
python = "^3.11"
fastapi = "^0.104.1"
uvicorn = {extras = ["standard"], version = "^0.24.0"}
python-dotenv = "^1.0.0"
pydantic = "^2.5.0"
pydantic-settings = "^2.1.0"
google-generativeai = "^0.3.0"
python-pptx = "^0.6.23"
reportlab = "^4.0.0"
aiofiles = "^23.2.0"

[tool.poetry.group.dev.dependencies]
pytest = "^7.4.3"
pytest-asyncio = "^0.21.1"
pytest-cov = "^4.1.0"
black = "^23.11.0"
isort = "^5.12.0"
flake8 = "^6.1.0"

[build-system]
requires = ["poetry-core"]
build-backend = "poetry.core.masonry.api"

[tool.black]
line-length = 88
target-version = ['py311']

[tool.isort]
profile = "black"
multi_line_output = 3
```

## 环境配置 (.env.example)

```env
# Gemini API Key
GEMINI_API_KEY=your_gemini_api_key_here

# API 配置
API_V1_STR=/api/v1
PROJECT_NAME=NanoDeck AI API

# CORS 配置
BACKEND_CORS_ORIGINS=["http://localhost:3000", "http://localhost:5173"]

# 导出配置
EXPORT_DIR=./exports
MAX_FILE_SIZE=52428800
```

## Docker 配置 (Dockerfile)

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# 安装 Poetry
RUN pip install poetry

# 复制依赖文件
COPY pyproject.toml poetry.lock* ./

# 配置 Poetry
RUN poetry config virtualenvs.create false

# 安装依赖
RUN poetry install --no-dev --no-interaction --no-ansi

# 复制应用代码
COPY ./app ./app

# 创建导出目录
RUN mkdir -p /app/exports

# 暴露端口
EXPOSE 8000

# 启动命令
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "4", "--worker-class", "uvicorn.workers.UvicornWorker", "app.main:app"]
```

## 测试策略

### 1. 单元测试 (tests/test_services.py)

```python
import pytest
from unittest.mock import Mock, patch
from app.services.gemini import GeminiService
from app.services.presentation import PresentationService
from app.schemas.presentation import GeneratePlanRequest


@pytest.fixture
def gemini_service():
    return GeminiService()


@pytest.fixture
def presentation_service():
    return PresentationService()


@pytest.mark.asyncio
async def test_generate_plan_success(gemini_service):
    # Mock Gemini API 响应
    mock_response = Mock()
    mock_response.text = '''{"slides": [{"id": 1, "title": "Test", "content": "Test content", "visualDescription": "Test image"}]}'''

    with patch.object(gemini_service.model, 'generate_content_async', return_value=mock_response):
        result = await gemini_service.generate_presentation_plan(
            content="Test content",
            slide_count=1,
            aspect_ratio="16:9",
            style_prompt="Test style",
            detail_level="标准"
        )

        assert len(result) == 1
        assert result[0].title == "Test"


@pytest.mark.asyncio
async def test_generate_image_success(gemini_service):
    # Mock 图片生成
    with patch.object(gemini_service.image_model, 'generate_content_async', return_value=Mock()):
        result = await gemini_service.generate_image(
            prompt="Test image",
            aspect_ratio="16:9",
            image_size="1K"
        )

        assert result.startswith("data:image/png;base64,")
```

### 2. API 测试 (tests/test_api.py)

```python
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_generate_plan():
    request_data = {
        "content": "Test presentation content",
        "slideCount": 3,
        "aspectRatio": "16:9",
        "stylePrompt": "Professional style",
        "detailLevel": "标准"
    }

    response = client.post("/api/v1/presentations/plan", json=request_data)
    assert response.status_code == 200
    assert "slides" in response.json()
```

## 开发工作流

### 1. 环境搭建

```bash
# 安装 Poetry
curl -sSL https://install.python-poetry.org | python3 -

# 克隆后端 worktree
git worktree add ../nanodeck-backend backend
cd ../nanodeck-backend

# 安装依赖
poetry install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，添加 GEMINI_API_KEY
```

### 2. 开发服务器

```bash
# 激活虚拟环境
poetry shell

# 启动开发服务器
poetry run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 访问 API 文档
# http://localhost:8000/docs
```

### 3. 测试

```bash
# 运行测试
poetry run pytest

# 运行测试并生成覆盖率报告
poetry run pytest --cov=app --cov-report=html
```

### 4. 代码质量

```bash
# 格式化代码
poetry run black app/ tests/
poetry run isort app/ tests/

# 检查代码风格
poetry run flake8 app/ tests/
```

## 与前端集成

### API 客户端示例

```typescript
// frontend/src/services/api.ts
import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const presentationApi = {
  // 生成演示文稿大纲
  generatePlan: async (data: GeneratePlanRequest) => {
    const response = await apiClient.post<GeneratePlanResponse>('/api/v1/presentations/plan', data);
    return response.data;
  },

  // 生成单张图片
  generateImage: async (data: GenerateImageRequest) => {
    const response = await apiClient.post<GenerateImageResponse>('/api/v1/presentations/generate-image', data);
    return response.data;
  },

  // 批量生成图片
  generateImagesBatch: async (data: BatchImageRequest) => {
    const response = await apiClient.post<BatchImageResponse>('/api/v1/presentations/generate-images', data);
    return response.data;
  },

  // 导出 PPTX
  exportToPPTX: async (data: ExportRequest) => {
    const response = await apiClient.post<ExportResponse>('/api/v1/presentations/export/pptx', data);
    return response.data;
  },

  // 导出 PDF
  exportToPDF: async (data: ExportRequest) => {
    const response = await apiClient.post<ExportResponse>('/api/v1/presentations/export/pdf', data);
    return response.data;
  },
};
```

## 部署配置

### Docker Compose

```yaml
version: '3.8'

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      - GEMINI_API_KEY=${GEMINI_API_KEY}
    volumes:
      - ./backend/exports:/app/exports
    restart: unless-stopped

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:80"
    depends_on:
      - backend
    environment:
      - VITE_API_BASE_URL=http://localhost:8000
    restart: unless-stopped
```

## 待实现功能

1. **图片生成优化**
   - 实现真正的 Gemini 图片生成（当前为模拟）
   - 添加图片缓存机制
   - 支持图片格式转换

2. **导出功能完善**
   - 实现 PPTX 导出（使用 python-pptx）
   - 实现 PDF 导出（使用 reportlab）
   - 添加导出进度跟踪

3. **性能优化**
   - 实现异步批量图片生成
   - 添加 Redis 缓存
   - 实现请求队列

4. **监控和日志**
   - 添加 Prometheus 指标
   - 实现结构化日
   - 添加错误追踪（Sentry）

5. **安全性增强**
   - 实现 API 认证（JWT）
   - 添加速率限制
   - 实现请求验证

6. **文件存储**
   - 支持云存储（S3、GCS）
   - 实现文件清理策略
   - 添加文件访问控制

## 开发时间估算

- **基础框架搭建**: 1 天
- **AI 服务集成**: 2 天
- **API 开发**: 2 天
- **测试编写**: 1 天
- **Docker 配置**: 0.5 天
- **文档编写**: 0.5 天
- **总计**: 约 7 天

这个计划提供了完整的 Python 后端实现方案，包括代码示例和详细的开发指南。可以根据实际需求进行调整和扩展。
