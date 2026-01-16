# E2E 测试 SOP（标准操作流程）

## 概述

本文档描述使用 Chrome DevTools MCP 对 Phantom-Lantern 项目进行端到端测试的标准操作流程。

---

## 1. 环境准备

### 1.1 服务启动

| 服务 | 端口 | 启动命令 | 健康检查 |
|------|------|----------|----------|
| Mock Server | 3001 | `npm run mock-server` | `GET /health` |
| 前端服务 | 3000 | `npm run dev` | 页面加载 |

**启动顺序**：
```bash
# 方式1：分别启动
# Terminal 1
cd mock-server && npm run dev

# Terminal 2
npm run dev

# 方式2：一键启动（开发用）
npm run dev:mock
```

**健康检查**：
```bash
# 检查 Mock Server
curl http://localhost:3001/health
# 预期返回: {"status":"ok"}

# 检查前端
curl -I http://localhost:3000
# 预期返回: HTTP 200
```

### 1.2 Chrome DevTools MCP 配置

确保 Claude Code 已配置 Chrome DevTools MCP 工具，可访问以下功能：
- `mcp__Chrome_DevTools_MCP__navigate_page` - 页面导航
- `mcp__Chrome_DevTools_MCP__take_snapshot` - 获取页面快照
- `mcp__Chrome_DevTools_MCP__click` - 点击元素
- `mcp__Chrome_DevTools_MCP__fill` - 填充表单
- `mcp__Chrome_DevTools_MCP__wait_for` - 等待文本出现
- `mcp__Chrome_DevTools_MCP__list_network_requests` - 查看网络请求

---

## 2. Mock Server 说明

### 2.1 API 端点映射

Mock Server 通过 `data/api-responses.json` 文件配置响应：

| 端点 | 方法 | 延迟 | 说明 |
|------|------|------|------|
| `/health` | GET | 0ms | 健康检查 |
| `/api/v1/presentations/plan` | POST | 600ms | 生成大纲 |
| `/api/v1/presentations/generate-image` | POST | 800ms | 生成单张图片 |
| `/api/v1/presentations/export/pptx` | POST | 400ms | 导出 PPTX |
| `/api/v1/presentations/export/pdf` | POST | 400ms | 导出 PDF |

### 2.2 特殊行为

**图片生成失败模拟**：
- Mock Server 会在**每第二次** `generate-image` 调用时返回 500 错误
- 调用 `plan` 接口会重置计数器
- 用于测试错误处理和重试逻辑

```javascript
// mock-server/src/index.mjs 中的逻辑
if (generateImageCallCount % 2 === 0) {
  res.status(500).json({ error: { code: "GENERATION_FAILED", ... } });
}
```

---

## 3. 测试用例执行流程

### TC-01: 输入内容 → 生成大纲

**目的**：验证从用户输入到大纲生成的完整流程

**步骤**：
1. 导航到 `http://localhost:3000`
2. 在文本输入框中输入测试内容
3. 点击「开始规划大纲」按钮
4. 等待大纲生成完成

**验证点**：
- [ ] 页面成功加载
- [ ] 输入框可正常输入
- [ ] 按钮点击后触发 loading 状态
- [ ] API `POST /api/v1/presentations/plan` 返回 200
- [ ] 大纲页面正确渲染（标题、内容、视觉描述）

**MCP 操作示例**：
```
1. navigate_page({ type: "url", url: "http://localhost:3000" })
2. take_snapshot() - 获取页面结构
3. fill({ uid: "<textarea-uid>", value: "测试内容" })
4. click({ uid: "<button-uid>" })
5. wait_for({ text: "大纲预览" }) 或等待特定内容出现
6. list_network_requests() - 验证 API 调用
```

---

### TC-02: 编辑大纲 → 生成图片

**目的**：验证大纲编辑和图片生成流程

**步骤**：
1. 在大纲页面修改幻灯片标题
2. 点击「开始绘图」按钮
3. 观察进度显示（0/N → N/N）
4. 等待所有图片生成完成

**验证点**：
- [ ] 标题编辑功能正常
- [ ] 进度显示正确更新
- [ ] API `POST /api/v1/presentations/generate-image` 被调用
- [ ] 图片成功显示

**注意**：第二张图片会失败（Mock 设计），进入 TC-03 流程

---

### TC-03: 图片生成失败 → 错误展示 → 重试

**目的**：验证错误处理和重试机制

**前置条件**：TC-02 执行后，第二张图片处于失败状态

**步骤**：
1. 观察错误提示信息
2. 找到「重试」按钮
3. 点击重试
4. 等待重试完成

**验证点**：
- [ ] 错误信息清晰展示
- [ ] 重试按钮可见且可点击
- [ ] 重试后 API 再次调用
- [ ] 重试成功后图片正常显示

---

### TC-04: 导出 PPTX

**目的**：验证 PPTX 导出功能

**前置条件**：所有图片生成成功，进入预览页面

**步骤**：
1. 在预览页面找到「PPTX」导出按钮
2. 点击按钮
3. 验证导出 API 调用

**验证点**：
- [ ] 按钮可点击
- [ ] API `POST /api/v1/presentations/export/pptx` 返回 200
- [ ] 导出完成提示（如有）

---

### TC-05: 导出 PDF

**目的**：验证 PDF 导出功能

**步骤**：
1. 在预览页面找到「PDF」导出按钮
2. 点击按钮
3. 验证导出 API 调用

**验证点**：
- [ ] 按钮可点击
- [ ] API `POST /api/v1/presentations/export/pdf` 返回 200
- [ ] 导出完成提示（如有）

---

## 4. 执行检查清单

### 4.1 测试前检查

- [ ] Mock Server 运行在 3001 端口
- [ ] 前端服务运行在 3000 端口
- [ ] Chrome 浏览器已打开并可被 MCP 控制
- [ ] 网络请求监控已启用

### 4.2 测试后检查

- [ ] 所有测试用例执行完成
- [ ] 记录失败用例及错误信息
- [ ] 收集网络请求日志
- [ ] 截图保存（如需）

---

## 5. 常用 MCP 命令速查

| 操作 | 命令 |
|------|------|
| 导航到页面 | `navigate_page({ type: "url", url: "..." })` |
| 获取页面快照 | `take_snapshot()` |
| 点击元素 | `click({ uid: "..." })` |
| 填充输入框 | `fill({ uid: "...", value: "..." })` |
| 等待文本 | `wait_for({ text: "...", timeout: 10000 })` |
| 查看网络请求 | `list_network_requests()` |
| 获取请求详情 | `get_network_request({ reqid: ... })` |
| 截图 | `take_screenshot()` |
| 查看控制台 | `list_console_messages()` |

---

## 6. 故障排除

### 6.1 Mock Server 无法启动

```bash
# 检查端口占用
lsof -i :3001

# 强制终止
kill -9 <PID>
```

### 6.2 前端服务连接 Mock Server 失败

检查 Vite 配置中的代理设置，确保 API 请求正确转发到 3001 端口。

### 6.3 MCP 无法连接浏览器

1. 确保 Chrome 浏览器已启动
2. 检查 DevTools 是否打开
3. 重新启动 MCP 连接

### 6.4 测试超时

增加 `wait_for` 的 timeout 参数，Mock Server 有延迟设计（600-800ms）。

---

## 7. 测试报告模板

```markdown
# E2E 测试报告

## 测试环境
- **测试日期**: YYYY-MM-DD
- **Mock Server**: http://localhost:3001
- **前端服务**: http://localhost:3000

## 测试结果

| 用例 | 描述 | 结果 |
|------|------|------|
| TC-01 | 输入 → 生成大纲 | ✅/❌ |
| TC-02 | 编辑 → 生成图片 | ✅/❌ |
| TC-03 | 错误处理 → 重试 | ✅/❌ |
| TC-04 | 导出 PPTX | ✅/❌ |
| TC-05 | 导出 PDF | ✅/❌ |

## 问题记录
（如有失败用例，记录详细信息）

## 总结
- 通过: X/5
- 失败: Y/5
```

---

## 附录 A: Mock 数据结构

### Plan 响应示例

```json
{
  "slides": [
    {
      "id": 1,
      "title": "幻灯片标题",
      "content": "- 要点1\\n- 要点2",
      "visualDescription": "视觉描述..."
    }
  ]
}
```

### Generate-Image 响应示例

```json
{
  "imageBase64": "data:image/png;base64,..."
}
```

### 错误响应格式

```json
{
  "error": {
    "code": "GENERATION_FAILED",
    "message": "错误描述"
  }
}
```
