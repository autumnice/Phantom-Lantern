/**
 * API 类型定义 - 对齐 OpenAPI 契约
 * 来源：shared/openapi/openapi.yaml
 */

// ==================== 基础枚举类型 ====================

/**
 * 错误码枚举
 */
export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'AI_GENERATION_FAILED'
  | 'AI_RATE_LIMITED'
  | 'AI_TIMEOUT'
  | 'EXPORT_FAILED'
  | 'INTERNAL_ERROR';

/**
 * 宽高比枚举
 */
export type AspectRatio = '16:9' | '4:3' | '1:1' | '3:4' | '9:16';

/**
 * 图像尺寸枚举
 */
export type ImageSize = '1K' | '2K' | '4K';

/**
 * 批量生成图片状态
 */
export type BatchImageStatus = 'success' | 'error';

// ==================== 错误响应 ====================

/**
 * 错误对象
 */
export interface ErrorObject {
  code: ErrorCode;
  message: string;
  details?: Record<string, unknown>;
  requestId?: string;
}

/**
 * 错误封装
 */
export interface ErrorEnvelope {
  error: ErrorObject;
}

// ==================== Health ====================

export interface HealthResponse {
  status: string;
}

// ==================== 幻灯片计划 ====================

/**
 * 单个幻灯片计划
 */
export interface SlidePlan {
  id: number;
  title: string;
  content: string;
  visualDescription: string;
}

// ==================== Plan API ====================

/**
 * 生成计划请求
 */
export interface GeneratePlanRequest {
  content: string;
  slideCount: number;
  aspectRatio: AspectRatio;
  stylePrompt: string;
  detailLevel: string;
  useSearch?: boolean;
}

/**
 * 生成计划响应
 */
export interface GeneratePlanResponse {
  slides: SlidePlan[];
}

// ==================== Image API ====================

/**
 * 生成单张图片请求
 */
export interface GenerateImageRequest {
  prompt: string;
  aspectRatio: AspectRatio;
  imageSize: ImageSize;
}

/**
 * 生成单张图片响应
 */
export interface GenerateImageResponse {
  imageBase64: string;
}

/**
 * 批量生成幻灯片项
 */
export interface BatchSlideItem {
  id: number;
  prompt: string;
}

/**
 * 批量生成图片请求
 */
export interface GenerateImagesBatchRequest {
  slides: BatchSlideItem[];
  aspectRatio: AspectRatio;
  imageSize: ImageSize;
}

/**
 * 批量生成结果项
 */
export interface BatchResultItem {
  id: number;
  status: BatchImageStatus;
  imageBase64?: string | null;
  error?: string | null;
}

/**
 * 批量生成图片响应
 */
export interface GenerateImagesBatchResponse {
  slides: BatchResultItem[];
}

// ==================== Export API ====================

/**
 * 导出幻灯片项
 */
export interface ExportSlide {
  id: number;
  [key: string]: unknown;
}

/**
 * 导出请求
 */
export interface ExportRequest {
  slides: ExportSlide[];
  aspectRatio: AspectRatio;
}

/**
 * 导出响应
 */
export interface ExportResponse {
  fileUrl: string;
}

// ==================== 类型守卫 ====================

/**
 * 检查是否为 ErrorEnvelope
 */
export function isErrorEnvelope(obj: unknown): obj is ErrorEnvelope {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'error' in obj &&
    typeof (obj as ErrorEnvelope).error === 'object' &&
    'code' in (obj as ErrorEnvelope).error &&
    'message' in (obj as ErrorEnvelope).error
  );
}

/**
 * 检查是否为有效的 ErrorCode
 */
export function isValidErrorCode(code: string): code is ErrorCode {
  return [
    'VALIDATION_ERROR',
    'AI_GENERATION_FAILED',
    'AI_RATE_LIMITED',
    'AI_TIMEOUT',
    'EXPORT_FAILED',
    'INTERNAL_ERROR',
  ].includes(code);
}
