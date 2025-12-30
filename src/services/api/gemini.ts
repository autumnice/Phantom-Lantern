import { GoogleGenAI, Type } from '@google/genai';
import type {
  SlidePlan,
  AspectRatio,
  ImageSize,
  GeminiError
} from '../../types';

// ==================== Interfaces ====================

export interface GeminiConfig {
  apiKey: string;
  model?: string;
}

export interface GeneratePlanOptions {
  slideCount: number;
  aspectRatio: AspectRatio;
  stylePrompt: string;
  detailLevel: string;
  content: string;
  useSearch?: boolean;
}

export interface GenerateImageOptions {
  prompt: string;
  aspectRatio: AspectRatio;
  imageSize: ImageSize;
}

// ==================== Main Service ====================

export class GeminiService {
  private ai: GoogleGenAI;
  private config: GeminiConfig;

  constructor(config: GeminiConfig) {
    this.config = config;
    this.ai = new GoogleGenAI({ apiKey: config.apiKey });
  }

  /**
   * 生成演示文稿大纲
   */
  async generatePlan(options: GeneratePlanOptions): Promise<SlidePlan[]> {
    const {
      slideCount,
      aspectRatio,
      stylePrompt,
      detailLevel,
      content,
      useSearch = false
    } = options;

    const prompt = `
      Presentation Architect Mode.
      User wants a ${slideCount}-slide presentation.
      Aspect Ratio: ${aspectRatio}.
      Visual Style: ${stylePrompt}.
      Detail Level: ${detailLevel}.

      SOURCE CONTENT OR LINK:
      "${content}"

      TASK:
      1. Analyze the content (use search tool if URL is provided).
      2. Create a slide-by-slide plan that fits the ${aspectRatio} format.
      3. For each slide, provide a Title, Content, and a detailed Visual Description (English prompt for image gen).

      Output format: STRICT JSON ARRAY of objects:
      [{"id": 1, "title": "...", "content": "...", "visualDescription": "..."}]

      Language: Chinese (Simplified).
    `;

    try {
      const resp = await this.ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: {
          tools: useSearch ? [{ googleSearch: {} }] : undefined,
          responseMimeType: 'application/json'
        }
      });

      const resText = resp.text.trim();
      const generatedPlan = JSON.parse(resText);

      // 验证数据结构
      if (!Array.isArray(generatedPlan)) {
        throw new Error('Invalid plan format: expected array');
      }

      return generatedPlan.map((item, index) => ({
        id: item.id || index + 1,
        title: item.title || '',
        content: item.content || '',
        visualDescription: item.visualDescription || ''
      }));
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * 生成单张图片
   */
  async generateImage(options: GenerateImageOptions): Promise<string> {
    const { prompt, aspectRatio, imageSize } = options;

    try {
      const resp = await this.ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: { parts: [{ text: prompt }] },
        config: {
          imageConfig: {
            aspectRatio,
            imageSize
          }
        }
      });

      // 提取 base64 图片数据
      if (resp.candidates?.[0]?.content?.parts) {
        for (const part of resp.candidates[0].content.parts) {
          if (part.inlineData) {
            return `data:image/png;base64,${part.inlineData.data}`;
          }
        }
      }

      throw new Error('No image data returned from API');
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * 测试 API 连接
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: 'Test connection',
        config: { maxOutputTokens: 10 }
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 错误处理
   */
  private handleError(error: any): GeminiError {
    console.error('Gemini API Error:', error);

    const errorMessage = error.message || 'Unknown error';
    const isNotFound = errorMessage.includes('Requested entity was not found');
    const isOverloaded = errorMessage.includes('503') ||
                        errorMessage.includes('overloaded') ||
                        errorMessage.includes('UNAVAILABLE');
    const isPermission = errorMessage.includes('permission') ||
                        errorMessage.includes('PERMISSION_DENIED');

    if (isNotFound) {
      return {
        message: '所选 API 密钥的项目未启用计费，请重新选择以使用 Pro 模型。',
        code: 'BILLING_NOT_ENABLED',
        status: 404
      };
    }

    if (isOverloaded) {
      return {
        message: '服务器繁忙，请稍后重试',
        code: 'SERVER_OVERLOADED',
        status: 503
      };
    }

    if (isPermission) {
      return {
        message: 'API 权限不足，请检查 API 密钥',
        code: 'PERMISSION_DENIED',
        status: 403
      };
    }

    return {
      message: errorMessage,
      code: 'UNKNOWN_ERROR',
      status: 500
    };
  }
}

// ==================== Singleton Instance ====================

let geminiService: GeminiService | null = null;

export const getGeminiService = (apiKey?: string): GeminiService => {
  if (!geminiService && apiKey) {
    geminiService = new GeminiService({ apiKey });
  }

  if (!geminiService) {
    throw new Error('GeminiService not initialized. Please provide an API key.');
  }

  return geminiService;
};

export const resetGeminiService = (): void => {
  geminiService = null;
};
