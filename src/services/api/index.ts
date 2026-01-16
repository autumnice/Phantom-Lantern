/**
 * API 服务导出
 *
 * 主 API: client.ts (HTTP API Client)
 * Fallback: gemini.ts (直连模式，仅用于开发/调试)
 */

// 主 API Client（推荐使用）
export * from './client';
export { default as apiClient } from './client';

// 直连模式 Fallback（开发/调试用，受 feature flag 控制）
export * from './gemini';
