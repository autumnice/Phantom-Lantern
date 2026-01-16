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
export const useExport = (): UseExportReturn => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportError, setExportError] = useState<string | null>(null);

  const resetExportState = useCallback(() => {
    setIsExporting(false);
    setExportProgress(0);
    setExportError(null);
  }, []);

  /**
   * 下载文件
   * 使用 fetch + blob 方式确保触发下载而非在浏览器中打开
   */
  const downloadFile = useCallback(async (fileUrl: string, fileName: string) => {
    // 如果是相对路径，补全为完整 URL
    const fullUrl = fileUrl.startsWith('http')
      ? fileUrl
      : `${apiClient.getBaseUrl()}${fileUrl}`;

    try {
      // 获取文件内容
      const response = await fetch(fullUrl);
      if (!response.ok) {
        throw new Error(`Failed to download: ${response.status}`);
      }

      // 转换为 blob
      const blob = await response.blob();

      // 创建 blob URL 并下载
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();

      // 清理
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Download file error:', error);
      throw error;
    }
  }, []);

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

  // 导出到 PPTX - 调用后端 API
  const exportToPPTX = useCallback(
    async (options: ExportOptions) => {
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

        // 调用后端 API
        const response = await apiClient.exportPptx({
          slides: validSlides,
          aspectRatio,
        });

        setExportProgress(80);

        // 下载文件
        const finalFileName = fileName || `NanoDeck-${Date.now()}.pptx`;
        await downloadFile(response.fileUrl, finalFileName);

        setExportProgress(100);
        resetExportState();
      } catch (error) {
        console.error('Export PPTX error:', error);
        if (error instanceof ApiError) {
            console.error('ApiError details:', error.details);
        }

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
    [prepareExportSlides, downloadFile, resetExportState]
  );

  // 导出到 PDF - 调用后端 API
  const exportToPDF = useCallback(
    async (options: ExportOptions) => {
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

        // 调用后端 API
        const response = await apiClient.exportPdf({
          slides: validSlides,
          aspectRatio,
        });

        setExportProgress(80);

        // 下载文件
        const finalFileName = fileName || `NanoDeck-${Date.now()}.pdf`;
        await downloadFile(response.fileUrl, finalFileName);

        setExportProgress(100);
        resetExportState();
      } catch (error) {
        console.error('Export PDF error:', error);
        if (error instanceof ApiError) {
            console.error('ApiError details:', error.details);
        }

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
    [prepareExportSlides, downloadFile, resetExportState]
  );

  return {
    exportToPPTX,
    exportToPDF,
    isExporting,
    exportProgress,
    exportError,
  };
};

// ==================== Helper Hooks ====================

/**
 * 检查是否可以导出
 */
export const useCanExport = (slides: SlideImage[]): boolean => {
  return slides.some((slide) => slide.base64 && slide.status === 'done');
};

/**
 * 获取导出统计
 */
export const useExportStats = (slides: SlideImage[]) => {
  const total = slides.length;
  const completed = slides.filter((s) => s.status === 'done').length;
  const canExport = completed > 0;

  return {
    total,
    completed,
    canExport,
    pending: total - completed,
  };
};

/**
 * 获取支持的导出格式
 */
export const useSupportedFormats = () => {
  return [
    {
      id: 'pptx',
      name: 'PowerPoint',
      icon: 'fa-file-powerpoint',
      color: 'orange',
    },
    {
      id: 'pdf',
      name: 'PDF',
      icon: 'fa-file-pdf',
      color: 'red',
    },
  ];
};
