// API 相关类型定义

export interface GeminiError {
  message: string;
  code?: string;
  status?: number;
}

export interface GenerationConfig {
  aspectRatio: import('./slide').AspectRatio;
  imageSize: import('./slide').ImageSize;
}

export interface ExportOptions {
  aspectRatio: import('./slide').AspectRatio;
  fileName?: string;
}
