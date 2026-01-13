# NanoDeck AI 并行开发架构设计

## 概述

支持前后端独立并行开发的架构设计，使用 Git Worktree 和 Mock Server 实现解耦合发。

## 架构目标

1. **完全解耦**：前端和后端可以独立开发、测试、部署
2. **并行开发**：支持两个 Claude CLI 实例同时工作
3. **独立验证**：前端不依赖后端即可完成大部分功能验证
4. **平滑集成**：提供清晰的集成路径和验证机制

## 核心架构

```
NanoDeck-AI/ (主仓库)
├── frontend/ (Git Worktree - 独立分支)
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── .env.development
│
├── backend/ (Git Worktree - 独立分支)
│   ├── app/
│   ├── tests/
│   ├── pyproject.toml
│   └── .env
│
└── mock-server/ (独立服务)
    ├── src/
    ├── package.json
    └── data/
```

## Git Worktree 配置

### 1. 创建 Worktree 结构

```bash
# 主仓库保持原样（保留现有单文件应用）
# 创建前端 worktree（从 main 分支创建）
git worktree add ../nanodeck-frontend frontend-dev

# 创建后端 worktree（从 main 分支创建）
git worktree add ../nanodeck-backend backend-dev
```

### 2. 目录结构

```
~/projects/
├── NanoDeck-AI/           # 主仓库（原始单文件应用）
├── nanodeck-frontend/     # 前端 worktree
└── nanodeck-backend/      # 后端 worktree
```

### 3. 工作流程

#### 前端开发
```bash
cd ~/projects/nanodeck-frontend
npm run dev              # 启动前端开发服务器
npm run mock             # 启动 mock server
```

#### 后端开发
```bash
cd ~/projects/nanodeck-backend
poetry run uvicorn app.main:app --reload  # 启动后端 API
```

#### 集成测试
```bash
cd ~/projects/NanoDeck-AI
docker-compose up --build  # 同时启动前后端
```

## Mock Server 设计

### 1. 目的

- 前端开发时无需真实后端即可验证功能
- 模拟 API 响应，支持前端独立测试
- 提供一致的 API 契约验证

### 2. 技术栈

- **框架**：Express.js 或 Fastify
- **数据**：JSON 文件存储模拟数据
- **部署**：与前端 dev server 并行运行

### 3. API 模拟

#### 配置文件 (`mock-server/data/api-responses.json`)
```json
{
  "POST /api/v1/presentations/plan": {
    "delay": 2000,
    "response": {
      "slides": [
        {
          "id": 1,
          "title": "第一张幻灯片",
          "content": "这是内容",
          "visualDescription": "A professional business presentation slide with modern design"
        }
      ]
    }
  },
  "POST /api/v1/presentations/generate-image": {
    "delay": 3000,
    "response": {
      "imageBase64": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    }
  }
}
```

### 4. Mock Server 实现

```typescript
// mock-server/src/index.ts
import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// 动态加载 API 响应配置
async function loadApiResponses() {
  const data = await fs.readFile(
    path.join(__dirname, '../data/api-responses.json'),
    'utf-8'
  );
  return JSON.parse(data);
}

// 动态路由处理
app.all('*', async (req, res) => {
  const apiResponses = await loadApiResponses();
  const key = `${req.method} ${req.path}`;

  const mock = apiResponses[key];
  if (!mock) {
    return res.status(404).json({ error: 'Mock not found' });
  }

  // 模拟延迟
  if (mock.delay) {
    await new Promise(resolve => setTimeout(resolve, mock.delay));
  }

  // 返回模拟响应
  res.json(mock.response);
});

app.listen(PORT, () => {
  console.log(`Mock server running on http://localhost:${PORT}`);
});
```

### 5. 前端环境配置

```typescript
// frontend/src/services/api/client.ts
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});
```

```bash
# frontend/.env.development
VITE_API_BASE_URL=http://localhost:3001  # Mock server
VITE_USE_MOCK=true
```

```bash
# frontend/.env.production
VITE_API_BASE_URL=http://localhost:8000  # Real backend
VITE_USE_MOCK=false
```

## 开发模式

### 模式 1：纯前端开发（使用 Mock）

```bash
# Terminal 1: 启动 Mock Server
cd mock-server
npm run dev

# Terminal 2: 启动前端应用
cd frontend
npm run dev
```

**适用场景**：
- UI/UX 开发
- 组件开发
- 前端逻辑验证
- 无需真实 AI 生成

### 模式 2：纯后端开发

```bash
# Terminal: 启动后端 API
cd backend
poetry run uvicorn app.main:app --reload
```

**适用场景**：
- API 开发
- AI 服务集成
- 业务逻辑实现
- 性能优化

### 模式 3：集成开发

```bash
# Terminal 1: 启动后端
cd backend
poetry run uvicorn app.main:app --reload

# Terminal 2: 启动前端（连接真实后端）
cd frontend
npm run dev:real-api
```

**适用场景**：
- 联调测试
- 端到端验证
- 性能测试
- 部署前验证

## API 契约管理

### 1. OpenAPI 规范

后端自动生成 OpenAPI 文档：
```bash
cd backend
poetry run python -m app.main --generate-openapi > ../openapi.json
```

### 2. 类型同步

```bash
# 前端根据 OpenAPI 生成 TypeScript 类型
npm run generate-types
```

```typescript
// frontend/package.json
{
  "scripts": {
    "generate-types": "openapi-typescript ../openapi.json --output src/types/api.ts"
  }
}
```

### 3. 契约测试

```python
# backend/tests/test_contract.py
from pact import Consumer, Provider

pact = Consumer('Frontend').has_pact_with(Provider('Backend'))

(pact
 .given('presentation plan exists')
 .upon_receiving('a request for plan generation')
 .with_request('post', '/api/v1/presentations/plan')
 .will_respond_with(200, body={
     'slides': [
         {
             'id': 1,
             'title': 'string',
             'content': 'string',
             'visualDescription': 'string'
         }
     ]
 }))
```

## 测试策略

### 1. 前端测试（独）

```bash
cd frontend

# 单元测试
npm run test:unit

# 集成测试（使用 mock）
npm run test:integration

# E2E 测试（使用 mock）
npm run test:e2e
```

### 2. 后端测试（独立）

```bash
cd backend

# 单元测试
poetry run pytest tests/unit/

# API 测试
poetry run pytest tests/api/

# 集成测试
poetry run pytest tests/integration/
```

### 3. 契约测试

```bash
# 验证前后端 API 契约
cd backend
poetry run pytest tests/contract/
```

### 4. 端到端测试（完整）

```bash
cd NanoDeck-AI
docker-compose -f docker-compose.test.yml up --abort-on-container-exit
```

## 代码同步策略

### 1. 共享类型定义

```
shared/
└── types/
    ├── api.ts          # API 类型（前端使用）
    └── schemas.py      # Pydantic 模型（后端使用）
```

### 2. 自动化同步

```bash
# scripts/sync-types.sh
#!/bin/bash

# 从后端生 OpenAPI
cd backend
poetry run python -m app.main --generate-openapi > ../shared/openapi.json

# 生成前端类型
cd ../frontend
npm run generate-types

echo "类型同步完成！"
```

### 3. Git Hooks

```bash
# .git/hooks/pre-commit
#!/bin/bash

# 检查 API 变更
if git diff --cached --name-only | grep -q "backend/app/schemas/"; then
  echo "检测到 API schema 变更，正在同步类型..."
  ./scripts/sync-types.sh
  git add shared/ frontend/src/types/
fi
```

## 部署策略

### 1. 独立部署

```yaml
# docker-compose.yml
version: '3.8'

services:
  frontend:
    build: ./frontend
    ports:
      - "3000:80"
    environment:
      - VITE_API_BASE_URL=http://backend:8000

  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - GEMINI_API_KEY=${GEMINI_API_KEY}
```

### 2. 环境隔离

```bash
# .env.frontend
VITE_API_BASE_URL=http://localhost:8000
VITE_ENV=production

# .env.backend
GEMINI_API_KEY=your_key
ENV=production
```

## 并行开发最佳实践

### 1. 支策略

```
main
├── frontend-dev    # 前端开发分支
├── backend-dev     # 后端开发分支
└── integration     # 集成测试分支
```

### 2. 提交规范

```bash
# 前端提交
git commit -m "feat(frontend): add slide preview component"

# 后端提交
git commit -m "feat(backend): add image generation endpoint"

# 集成提交
git commit -m "integration: connect frontend to real backend"
```

### 3. 每日同步

```bash
# 每天同步主分支
git fetch origin
git rebase origin/main

# 解决冲突后继续开发
```

### 4. 代码审查

```bash
# 前端审查（在 frontend worktree）
cr src/

# 后端审查（在 backend worktree）
cr app/

# 集成审查（在主仓库）
cr-full
```

## 故障排除

### 问题 1：Worktree 冲突

```bash
# 如果 worktree 出现问题，可以移除重建
git worktree remove ../nanodeck-frontend
git worktree add ../nanodeck-frontend frontend-dev
```

### 问题 2：Mock 数据不同步

```bash
# 更新 mock 数据
npm run mock:update

# 验证 mock 响应
npm run mock:validate
```

### 问题 3：类型不一致

```bash
# 重新生成类型
./scripts/sync-types.sh

# 验证类型一致性
npm run type-check
poetry run mypy app/
```

## 总结

这个架构设计支持：

1. ✅ **完全独立的开发环境**
   - 前端使用 Mock Server 独立开发
   - 后端独立测试 API
   - 互不阻塞

2. ✅ **并行工作流程**
   - 两个 Claude CLI 实例同时工作
   - 独立的代码审查流程
   - 独立的部署流程

3. ✅ **清晰的集成路径**
   - 基于 API 契约的集成
   - 自动化类型同步
   - 完整的测试覆盖

4. ✅ **生产就绪**
   - 支持独立扩展
   - 完整的监控和日志
   - 灰度发布支

## 下一步

1. 创建前端详细实施计划（使用 frontend-design skill）
2. 创建后端详细实施计划（内存缓存）
3. 创建集成测试计划
4. 创建并行开发工作流指南
