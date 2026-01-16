/**
 * HTTP API Client - 对齐 OpenAPI 契约
 *
 * 硬约束：
 * 1. 前端不直连 Gemini，不在浏览器侧使用 GEMINI_API_KEY
 * 2. 所有请求通过此 client，只通过 VITE_API_BASE_URL 切换 mock/real
 * 3. 错误格式统一为 ErrorEnvelope
 */

import type {
  HealthResponse,
  GeneratePlanRequest,
  GeneratePlanResponse,
  GenerateImageRequest,
  GenerateImageResponse,
  GenerateImagesBatchRequest,
  GenerateImagesBatchResponse,
  ExportRequest,
  ExportResponse,
  ErrorEnvelope,
  ErrorCode,
  isErrorEnvelope,
} from '../../types/api.generated';

// ==================== Configuration ====================

/**
 * 获取 API 基础 URL
 * 默认使用 mock-server (3001)，可通过 VITE_API_BASE_URL 覆盖
 */
function getBaseUrl(): string {
  // Vite 环境变量 (优先)
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  // 默认 fallback (mock-server)
  return 'http://localhost:3001';
}

// Log current API configuration for debugging
console.log('[API] Client initialized with base URL:', getBaseUrl());

// ==================== Error Handling ====================

/**
 * API 错误类
 */
export class ApiError extends Error {
  public readonly code: ErrorCode;
  public readonly status: number;
  public readonly details?: Record<string, unknown>;
  public readonly requestId?: string;

  constructor(
    code: ErrorCode,
    message: string,
    status: number = 500,
    details?: Record<string, unknown>,
    requestId?: string
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
    this.requestId = requestId;
  }

  /**
   * 从 ErrorEnvelope 创建 ApiError
   */
  static fromEnvelope(envelope: ErrorEnvelope, status: number): ApiError {
    const { code, message, details, requestId } = envelope.error;
    return new ApiError(code, message, status, details, requestId);
  }

  /**
   * 判断是否可重试
   */
  get isRetryable(): boolean {
    return (
      this.code === 'AI_RATE_LIMITED' ||
      this.code === 'AI_TIMEOUT' ||
      this.status === 503 ||
      this.status === 429
    );
  }

  /**
   * 获取用户友好的错误消息
   */
  get userMessage(): string {
    switch (this.code) {
      case 'VALIDATION_ERROR':
        return '输入参数有误，请检查后重试';
      case 'AI_GENERATION_FAILED':
        return 'AI 生成失败，请重试或调整内容';
      case 'AI_RATE_LIMITED':
        return '请求过于频繁，请稍后再试';
      case 'AI_TIMEOUT':
        return '生成超时，请重试';
      case 'EXPORT_FAILED':
        return '导出失败，请重试';
      case 'INTERNAL_ERROR':
      default:
        return '服务暂时不可用，请稍后再试';
    }
  }
}

// ==================== HTTP Client ====================

/**
 * 请求配置
 */
interface RequestConfig {
  timeout?: number;
  headers?: Record<string, string>;
}

/**
 * 发送 HTTP 请求
 */
async function request<T>(
  method: 'GET' | 'POST',
  path: string,
  body?: unknown,
  config: RequestConfig = {}
): Promise<T> {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}${path}`;
  const { timeout = 60000, headers = {} } = config;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // 解析响应
    let data: unknown;
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    // 检查错误响应
    if (!response.ok) {
      // 检查是否为 ErrorEnvelope 格式
      if (typeof data === 'object' && data !== null && 'error' in data) {
        const envelope = data as ErrorEnvelope;
        throw ApiError.fromEnvelope(envelope, response.status);
      }
      // 非标准错误
      throw new ApiError(
        'INTERNAL_ERROR',
        typeof data === 'string' ? data : 'Unknown error',
        response.status
      );
    }

    return data as T;
  } catch (error) {
    clearTimeout(timeoutId);

    // 已经是 ApiError
    if (error instanceof ApiError) {
      throw error;
    }

    // 超时错误
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError('AI_TIMEOUT', '请求超时', 408);
    }

    // 网络错误
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new ApiError('INTERNAL_ERROR', '网络连接失败，请检查网络', 0);
    }

    // 其他错误
    throw new ApiError(
      'INTERNAL_ERROR',
      error instanceof Error ? error.message : 'Unknown error',
      500
    );
  }
}

// ==================== API Methods ====================

/**
 * 健康检查
 */
export async function health(): Promise<HealthResponse> {
  return request<HealthResponse>('GET', '/health', undefined, { timeout: 3000 });
}

/**
 * 生成演示计划
 */
export async function generatePlan(
  params: GeneratePlanRequest
): Promise<GeneratePlanResponse> {
  return request<GeneratePlanResponse>(
    'POST',
    '/api/v1/presentations/plan',
    params,
    { timeout: 120000 } // 2 分钟超时
  );
}

/**
 * 生成单张图片
 */
export async function generateImage(
  params: GenerateImageRequest
): Promise<GenerateImageResponse> {
  return request<GenerateImageResponse>(
    'POST',
    '/api/v1/presentations/generate-image',
    params,
    { timeout: 180000 } // 3 分钟超时
  );
}

/**
 * 批量生成图片
 */
export async function generateImagesBatch(
  params: GenerateImagesBatchRequest
): Promise<GenerateImagesBatchResponse> {
  return request<GenerateImagesBatchResponse>(
    'POST',
    '/api/v1/presentations/generate-images',
    params,
    { timeout: 600000 } // 10 分钟超时
  );
}

/**
 * 导出 PPTX
 */
export async function exportPptx(
  params: ExportRequest
): Promise<ExportResponse> {
  return request<ExportResponse>(
    'POST',
    '/api/v1/presentations/export/pptx',
    params,
    { timeout: 120000 } // 2 分钟超时
  );
}

/**
 * 导出 PDF
 */
export async function exportPdf(
  params: ExportRequest
): Promise<ExportResponse> {
  return request<ExportResponse>(
    'POST',
    '/api/v1/presentations/export/pdf',
    params,
    { timeout: 120000 } // 2 分钟超时
  );
}

// ==================== Client Instance ====================

/**
 * API Client 实例
 */
export const apiClient = {
  health,
  generatePlan,
  generateImage,
  generateImagesBatch,
  exportPptx,
  exportPdf,
  getBaseUrl,
};

export default apiClient;
