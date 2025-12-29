import { useCallback, useState } from 'react';
import { getPPTXExportService, getPDFExportService } from '../services';
import type { SlideImage, AspectRatio } from '../types';

// ==================== Hook Interface ====================

export interface UseExportReturn {
  // 导出到 PPTX
  exportToPPTX: (options: ExportOptions) => Promise<void>;

  // 导出到 PDF
  exportToPDF: (options: ExportOptions) => Promise<void>;

  // 导出状态
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

export const useExport = (): UseExportReturn => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportError, setExportError] = useState<string | null>(null);

  // 重置导出状态
  const resetExportState = useCallback(() => {
    setIsExporting(false);
    setExportProgress(0);
    setExportError(null);
  }, []);

  // 导出到 PPTX
  const exportToPPTX = useCallback(async (options: ExportOptions) => {
    const { slides, aspectRatio, fileName } = options;

    // 验证
    const validSlides = slides.filter(s => s.base64 && s.status === 'done');
    if (validSlides.length === 0) {
      throw new Error('No completed slides to export');
    }

    setIsExporting(true);
    setExportProgress(0);
    setExportError(null);

    try {
      const service = getPPTXExportService();

      await service.export({
        slides: validSlides,
        aspectRatio,
        fileName: fileName || `NanoDeck-${Date.now()}.pptx`,
        onProgress: (progress) => {
          setExportProgress(progress);
        }
      });

      resetExportState();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Export failed';
      setExportError(errorMessage);
      setIsExporting(false);
      throw error;
    }
  }, [resetExportState]);

  // 导出到 PDF
  const exportToPDF = useCallback(async (options: ExportOptions) => {
    const { slides, aspectRatio, fileName } = options;

    // 验证
    const validSlides = slides.filter(s => s.base64 && s.status === 'done');
    if (validSlides.length === 0) {
      throw new Error('No completed slides to export');
    }

    setIsExporting(true);
    setExportProgress(0);
    setExportError(null);

    try {
      const service = getPDFExportService();

      await service.export({
        slides: validSlides,
        aspectRatio,
        fileName: fileName || `NanoDeck-${Date.now()}.pdf`,
        quality: 0.95,
        onProgress: (progress) => {
          setExportProgress(progress);
        }
      });

      resetExportState();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Export failed';
      setExportError(errorMessage);
      setIsExporting(false);
      throw error;
    }
  }, [resetExportState]);

  return {
    exportToPPTX,
    exportToPDF,
    isExporting,
    exportProgress,
    exportError
  };
};

// ==================== Helper Hooks ====================

/**
 * 检查是否可以导出
 */
export const useCanExport = (slides: SlideImage[]): boolean => {
  return slides.some(slide => slide.base64 && slide.status === 'done');
};

/**
 * 获取导出统计
 */
export const useExportStats = (slides: SlideImage[]) => {
  const total = slides.length;
  const completed = slides.filter(s => s.status === 'done').length;
  const canExport = completed > 0;

  return {
    total,
    completed,
    canExport,
    pending: total - completed
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
      color: 'orange'
    },
    {
      id: 'pdf',
      name: 'PDF',
      icon: 'fa-file-pdf',
      color: 'red'
    }
  ];
};
