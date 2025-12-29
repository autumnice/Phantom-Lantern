// 幻灯片相关类型定义

export interface SlidePlan {
  id: number;
  title: string;
  content: string;
  visualDescription: string;
}

export interface SlideImage {
  id: number;
  base64: string | null;
  status: 'pending' | 'generating' | 'done' | 'error' | 'retrying';
  prompt: string;
  retryCount?: number;
  errorMsg?: string;
}

export type AspectRatio = '16:9' | '4:3' | '1:1' | '3:4' | '9:16';
export type ImageSize = '1K' | '2K' | '4K';
export type AppStep = 'input' | 'planning' | 'generating' | 'preview';
