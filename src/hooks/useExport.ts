import { useCallback, useState } from 'react';
import { apiClient, ApiError } from '../services/api';
import type { SlideImage, AspectRatio } from '../types';

// ==================== Hook Interface ====================

export interface UseExportReturn {
  exportToPPTX: (options: ExportOptions) => Promise<void>;
  exportToPDF: (options: ExportOptions) => Promise<void>;
  isExporting: boolean;
  exportProgress: number;
  exportError: string | null;
}

export interface ExportOptions {
  slides: SlideImage[];
  aspectRatio: AspectRatio;
  fileName?: string;
}

// ==================== Main Hook ====================

/**
 * 导出 Hook
 *
 * 按照 ADR（export-responsibility-v1.md）规定：
 * - 后端负责生成 PPTX/PDF 文件
 * - 前端只负责触发与下载
 */
export function useExport(): UseExportReturn {
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportError, setExportError] = useState<string | null>(null);

  /**
   * 准备导出数据
   */
  const prepareExportSlides = useCallback((slides: SlideImage[]) => {
    return slides
      .filter((s) => s.base64 && s.status === 'done')
      .map((s) => ({
        id: s.id,
        imageBase64: s.base64,
        prompt: s.prompt,
      }));
  }, []);

  /**
   * 下载文件
   */
  const downloadFile = useCallback(async (fileUrl: string, fileName: string) => {
    const fullUrl = fileUrl.startsWith('http')
      ? fileUrl
      : `${apiClient.getBaseUrl()}${fileUrl}`;

    const response = await fetch(fullUrl);
    if (!response.ok) {
      throw new Error(`Failed to download: ${response.status}`);
    }

    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
  }, []);

  /**
   * 通用导出逻辑
   */
  const exportFile = useCallback(
    async (
      options: ExportOptions,
      exportFn: typeof apiClient.exportPptx | typeof apiClient.exportPdf,
      defaultExtension: string
    ) => {
      const { slides, aspectRatio, fileName } = options;

      const validSlides = prepareExportSlides(slides);
      if (validSlides.length === 0) {
        throw new Error('没有可导出的幻灯片');
      }

      setIsExporting(true);
      setExportProgress(0);
      setExportError(null);

      try {
        setExportProgress(30);

        const response = await exportFn({ slides: validSlides, aspectRatio });

        setExportProgress(80);

        const finalFileName = fileName || `NanoDeck-${Date.now()}.${defaultExtension}`;
        await downloadFile(response.fileUrl, finalFileName);

        setExportProgress(100);
        setIsExporting(false);
        setExportProgress(0);
        setExportError(null);
      } catch (error) {
        console.error(`Export ${defaultExtension} error:`, error);

        const errorMessage =
          error instanceof ApiError
            ? error.userMessage
            : error instanceof Error
            ? error.message
            : '导出失败';

        setExportError(errorMessage);
        setIsExporting(false);
        throw error;
      }
    },
    [prepareExportSlides, downloadFile]
  );

  const exportToPPTX = useCallback(
    (options: ExportOptions) => exportFile(options, apiClient.exportPptx, 'pptx'),
    [exportFile]
  );

  const exportToPDF = useCallback(
    (options: ExportOptions) => exportFile(options, apiClient.exportPdf, 'pdf'),
    [exportFile]
  );

  return {
    exportToPPTX,
    exportToPDF,
    isExporting,
    exportProgress,
    exportError,
  };
}

// ==================== Helper Hooks ====================

/**
 * 检查是否可以导出
 */
export function useCanExport(slides: SlideImage[]): boolean {
  return slides.some((slide) => slide.base64 && slide.status === 'done');
}
