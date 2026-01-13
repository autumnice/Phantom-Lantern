#!/bin/bash
# Claude Code Review Aliases - 在 Claude Code 会话中使用

echo "📝 定义 code review 别名..."

cr() {
  # 自动暂存所有更改
  echo "📝 正在暂存所有更改..."
  git add . 2>/dev/null

  # 获取新代码文件列表
  NEW_FILES=$(git diff --cached --name-only 2>/dev/null | grep -E '\.(tsx?|jsx?|ts|js)$' | head -20)

  if [ -z "$NEW_FILES" ]; then
    echo "⚠️ 没有发现新的代码文件"
    echo "📂 将审查当前目录..."
    TARGET="."
  else
    echo "🔍 发现新代码文件："
    echo "$NEW_FILES"
    echo ""
    TARGET="新代码文件：$NEW_FILES"
  fi

  echo "🤖 正在调用 code-reviewer 代理..."
  claude "使用 code-reviewer 代理审查以下$TARGET，重点关注 bug、性能和安全问题：

  审查要求：
  1. 严重 bug 和逻辑错误
  2. 性能问题（不必要的计算、重渲染等）
  3. 安全漏洞（XSS、数据泄露等）
  4. React 最佳实践违规
  5. TypeScript 类型安全问题

  输出格式：
  - 问题列表（严重/中等/轻微）
  - 文件和行号
  - 简要修复建议
  - 总体评分（1-10分）"
}

cr-full() {
  # 自动暂存所有更改
  echo "📝 正在暂存所有更改..."
  git add . 2>/dev/null

  # 获取新代码文件列表
  NEW_FILES=$(git diff --cached --name-only 2>/dev/null | grep -E '\.(tsx?|jsx?|ts|js)$' | head -20)

  if [ -z "$NEW_FILES" ]; then
    echo "⚠️ 没有发现新的代码文件"
    TARGET_DESC="完整代码库"
    TARGET="."
  else
    echo "🔍 发现新代码文件："
    echo "$NEW_FILES"
    echo ""
    TARGET_DESC="新代码（重点）+ 完整代码库（上下文）"
    TARGET="新代码：$NEW_FILES"
  fi

  echo "🤖 正在调用 code-reviewer 代理..."
  claude "使用 code-reviewer 代理进行$TARGET_DESC的完整代码审查：

  审查范围：$TARGET

  审查要求：
  1. 新代码的 bug、性能、安全问题（重点）
  2. 代码与现有代码的集成问题
  3. 架构一致性
  4. 代码可维护性
  5. 测试覆盖率
  6. 完整代码库的整体质量

  输出格式：
  - 详细问题报告
  - 代码示例
  - 具体修复步骤
  - 架构建议
  - 总体评分和总结"
}

echo "✅ 别名定义完成！"
echo ""
echo "使用方法："
echo "  cr      - 快速审查新代码"
echo "  cr-full - 完整审查代码库"
echo ""
echo "示例："
echo "  cr              # 审查新代码"
echo "  cr-full         # 完整审查"
echo "  cr src/components/ # 审查特定目录"
