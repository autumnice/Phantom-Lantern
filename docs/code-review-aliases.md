# Code Review 别名使用指南

## 快速开始

在 Claude Code 会话中运行以下命令来定义别名：

```bash
source scripts/claude-review-aliases.sh
```

## 可用命令

### `cr` - 快速审查新代码
自动暂存更改并审查新增或修改的代码文件。

```bash
cr                  # 审查所有新代码
cr src/components/  # 审查特定目录
```

### `cr-full` - 完整代码审查
进行全面的代码库审查，包括架构、可维护性等方面。

```bash
cr-full             # 完整审查代码库
cr-full src/hooks   # 完整审查特定目录
```

## 工作流程示例

### 场景 1：日常开发

```bash
# 修改代码后
vim src/App.tsx src/components/Button.tsx

# 快速审查
cr

# 根据审查结果修复问题
# ...

# 提交代码
git commit -m "fix: resolve review issues"
```

### 场景 2：重要功能提交前

```bash
# 完成大型功能
vim src/feature/*

# 完整审查
cr-full

# 修复所有问题
git commit -m "feat: add new feature"
```

### 场景 3：提交前检查

```bash
git add .
cr              # 确保代码质量
git commit -m "feat: add user authentication"
```

## 输出示例

```
📝 正在暂存所有更改...
🔍 发现新代码文件：
src/App.tsx
src/components/Button.tsx
src/hooks/useAuth.ts

🤖 正在调用 code-reviewer 代理...

=== Code Review Report ===

严重问题（2个）：
1. src/App.tsx:45 - Hook 调用位置错误
   建议：将 Hook 移到组件顶层

中等问题（3个）：
1. src/components/Button.tsx:12 - 缺少类型定义
   建议：添加 ButtonProps 接口

轻微问题（1个）：
1. src/hooks/useAuth.ts:8 - 注释不完整
   建议：补充 JSDoc 注释

总体评分：7.5/10

建议：修复严重问题后再提交
```

## 与 GitHub PR Review 对比

| 特性 | GitHub PR Review | cr / cr-full |
|------|------------------|--------------|
| 需要 PR | ✅ 是 | ❌ 否 |
| 自动暂存 | ❌ 否 | ✅ 是 |
| 针对新代码 | ✅ 是 | ✅ 是 |
| 完整审查 | ✅ 是 | ✅ 是 (cr-full) |
| 命令行 | ❌ 否 | ✅ 是 |
| 适用场景 | 开源项目 | 任何项目 |

## 最佳实践

### 1. 提交前审查

```bash
git add .
cr              # 快速检查
git commit -m "..."
```

### 2. 代码推送前

```bash
cr-full           # 完整审查
git push origin main
```

### 3. 代码审查清单

- [ ] 运行 `cr` 或 `cr-full`
- [ ] 修复所有严重问题
- [ ] 处理中等优先级问题
- [ ] 代码评分 >= 7.0
- [ ] 提交代码

## 注意事项

1. **会话生命周期**：Claude Code 中的别名只在当前会话有效
2. **持久化方案**：如需持久化，将 `source` 命令添加到 shell 配置文件
3. **灵活性**：保持别名简洁，复杂场景使用完整指令
4. **审查深度**：`cr` 关注新代码，`cr-full` 关注整体质量

## 故障排除

### 别名未找到

```bash
# 重新加载别名
source scripts/claude-review-aliases.sh
```

### 没有检测到新文件

```bash
# 确保已修改文件
git status

# 手动指定目录
cr src/
```

### 审查时间过长

```bash
# 使用快速模式
cr src/components/  # 指定小范围

# 或者使用 cr（比 cr-full 更快）
cr
```

## 扩展使用

### 在 CI/CD 中使用

```bash
#!/bin/bash
# pre-commit hook

echo "Running code review..."

source scripts/claude-review-aliases.sh

if ! cr; then
    echo "❌ Code review failed. Please fix issues before committing."
    exit 1
fi

echo "✅ Code review passed. Proceeding with commit..."
```

### 自定审查模板

可以修改 `scripts/claude-review-aliases.sh` 来自定义审查重点：

```bash
# 添加新的审查类型
cr-security() {
  claude "使用 code-reviewer 代理审查 ${1:-.}，重点关注安全漏洞..."
}

cr-performance() {
  claude "使用 code-reviewer 代理审查 ${1:-.}，重点关注性能问题..."
}
```

## 总结

- ✅ **简化操作**：一行命令完成审查
- ✅ **自动暂存**：集成到工作流程
- ✅ **两种模式**：快速审查 vs 完整审查
- ✅ **命令行体验**：类似 GitHub PR Review
- ✅ **无需 PR**：直接审查代码
- ✅ **提交前检查**：确保代码质量

立即开始使用：`source scripts/claude-review-aliases.sh`
