# NanoDeck AI - 幻灯侠 ⚡️

[English](#english) | [简体中文](#chinese)

<a name="english"></a>
## English

NanoDeck AI is a powerful presentation generator powered by Google's **Gemini 3 Pro (nano banana 3)**. It transforms text content or web links into visually stunning, structured presentation slides with high-quality AI-generated imagery.

This project utilizes the **nano banana 3** (Gemini 3 Pro) model for image generation, solving several limitations found in other tools like NotebookLM's "Slide Deck" feature:
- **No Image Limits**: Generate as many slides as you need.
- **Fully Editable**: Manually adjust outlines, content, and image prompts for each slide.
- **Custom Aspect Ratios**: Supports 16:9, 4:3, 1:1, 3:4, and 9:16.
- **Watermark-Free**: Clean, professional-grade visual output.
- **Style Control**: Choose from built-in themes or define your own custom visual style.

### Use Cases
- **Presentation Creation**: Quickly turn reports into decks.
- **Paper Interpretation**: Summarize complex academic papers into visual summaries.
- **Creative Storytelling**: Generate picture books or comic strips by guiding the AI's narrative.

---

<a name="chinese"></a>
## 简体中文

NanoDeck AI 是一款基于 Google **Gemini 3 Pro (nano banana 3)** 的强力演示文稿生成工具。它可以将纯文本内容或网页链接转化为结构清晰、视觉精美的幻灯片。

本项目使用 **nano banana 3** 系列模型生成图片，有效解决了类似 NotebookLM “演示文稿”功能中的诸多痛点：
- **无图片数量限制**：不再受限于固定的页数。
- **内容可编辑**：支持手动调整大纲、正文内容以及每一页的绘图提示词。
- **比例随心调整**：支持 16:9、4:3、1:1、3:4 以及 9:16 等多种主流比例。
- **无水印干扰**：生成纯净、高质量的专业视觉素材。
- **风格自定义**：内置多种设计风格，并支持通过提示词完全自定义视觉基调。

### 应用场景
- **幻灯片创作**：将工作报告、项目计划快速转化为演示文稿。
- **论文解读**：快速提取学术论文核心观点并生成可视化大纲。
- **绘本与漫画**：通过 AI 的叙事能力，快速创作具有连续性的绘本或简易漫画。

---

## Screenshots / 系统截图

### 1. Configuration / 配置页
![Setup](./screenshots/1_setup.png)

### 2. AI Planning / AI 深度规划
![Loading](./screenshots/2_loading.png)

### 3. Outline Refinement / 大纲规划
![Outline](./screenshots/3_outline.png)

### 4. Generation Preview / 生成预览
![Preview](./screenshots/4_preview.png)

### 5. Slide Details & Editing / 幻灯片详情与编辑
![Detail](./screenshots/5_detail.png)

---

## Prerequisites / 前提条件

- **Node.js**: Ensure you have Node.js installed on your machine.
- **Gemini API Key**: You need a valid API key from Google AI Studio.

## Installation / 安装步骤

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment**:
   Create a `.env.local` file in the root directory and set your API key:
   ```env
   API_KEY=your_gemini_api_key_here
   ```

3. **Run the app**:
   ```bash
   npm run dev
   ```
