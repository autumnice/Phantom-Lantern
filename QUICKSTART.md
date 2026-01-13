# Code Review 别名快速开始

## 安装和使用

### 第一步：加载别名

在 Claude Code 会话中运行：

```bash
source scripts/claude-review-aliases.sh
```

### 第二步：使用别名

#### 快速审查（推荐日常使用）

```bash
cr                  # 审查所有新代码
cr src/components/  # 审查特定目录
```

#### 完整审查（重要提交前）

```bash
cr-full             # 完整审查代码库
cr-full src/hooks   # 完整审查特定目录
```

## 实际工作流程示例

### 场景 1：修复 bug 后

```bash
# 1. 修改代码
vim src/components/Button.tsx

# 2. 快速审查
cr

# 3. 根据审查结果修复问题

# 4. 提交代码
git add .
git commit -m "fix: button click handler"
```

### 场景 2：开发新功能

```bash
# 1. 开发功能
vim src/feature/user-auth/*

# 2. 完整审查（重要功能）
cr-full

# 3. 修复所有问题

# 4. 提交并推送
git add .
git commit -m "feat: add user authentication"
git push origin main
```

### 场景 3：代码提交前检查

```bash
git add .
cr              # 确保代码质量
git commit -m "..."
```

## 输出示例

```
📝 正在暂存所有更改...
🔍 发现新代码文件：
src/App.tsx
src/components/Button.tsx

🤖 正在调用 code-reviewer 代理...

=== Code Review Report ===

严重问题（1个）：
1. src/App.tsx:45 - Hook 调用位置错误
   建议：将 Hook 移到组件顶层

中等问题（2个）：
1. src/components/Button.tsx:12 - 缺少类型定义
   建议：添加 ButtonProps 接口

总体评分：8.0/10

建议：修复严重问题后再提交
```

## 常见问题

### Q: 别名在会话结束后会消失吗？
A: 是的，Claude Code 中的别名只在当前会话有效。每次新会话都需要重新加载：

```bash
source scripts/claude-review-aliases.sh
```

### Q: 如何持久化别名？
A: 将加载命令添加到 shell 配置文件（`.zshrc`, `.bashrc`）：

```bash
echo 'source /Users/gude/codeup/Phantom-Lantern/scripts/claude-review-aliases.sh' >> ~/.zshrc
```

### Q: 审查时间太长怎么办？
A:
- 使用 `cr` 而不是 `cr-full`（更快）
- 指定特定文件或目录：`cr src/components/`
- 保持每次修改的代码量适中

### Q: 没有发现新文件？
A: 确保已修改文件并保存：

```bash
git status          # 查看修改的文件
cr src/             # 手动指定目录
```

## 命令对比

| 命令 | 速度 | 深度 | 适用场景 |
|------|------|------|----------|
| `cr` | 快 | 中等 | 日常开发 |
| `cr-full` | 较慢 | 深入 | 重要提交 |

## 最佳实践

1. **频繁审查**：每次修改后都运行 `cr`
2. **提交前检查**：确保代码质量
3. **重点修复**：优先处理严重问题
4. **团队协作**：分享审查结果，共同提高

## 快速命令参考

```bash
# 加载别名
source scripts/claude-review-aliases.sh

# 快速审查
cr                  # 所有新代码
cr src/             # 特定目录

# 完整审查
cr-full             # 完整代码库
cr-full src/hooks   # 特定目录
```

## 需要帮助？

查看完整文档：`docs/code-review-aliases.md`
