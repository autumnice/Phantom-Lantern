import type { SlideImage, AspectRatio } from '../../types';

// ==================== Interfaces ====================

export interface PDFExportOptions {
  slides: SlideImage[];
  aspectRatio: AspectRatio;
  fileName?: string;
  quality?: number; // 0-1, 图片质量
  onProgress?: (progress: number) => void;
}

// ==================== Main Service ====================

export class PDFExportService {
  private jsPDF: any;

  constructor() {
    // 检查 jsPDF 是否可用
    if (typeof window === 'undefined' || !(window as any).jspdf) {
      throw new Error('jsPDF is not loaded. Please include the library.');
    }
    this.jsPDF = (window as any).jspdf;
  }

  /**
   * 导出到 PDF
   */
  async export(options: PDFExportOptions): Promise<void> {
    const {
      slides,
      aspectRatio,
      fileName = `NanoDeck-${Date.now()}.pdf`,
      quality = 0.95,
      onProgress
    } = options;

    try {
      // 配置 PDF 参数
      const { width, height, orientation } = this.getPDFConfig(aspectRatio);

      // 创建 PDF
      const { jsPDF } = this.jsPDF;
      const doc = new jsPDF({
        orientation,
        unit: 'px',
        format: [width, height]
      });

      // 添加图片
      let validSlides = 0;
      for (let i = 0; i < slides.length; i++) {
        const slide = slides[i];
        if (slide.base64 && slide.status === 'done') {
          if (validSlides > 0) {
            doc.addPage([width, height], orientation);
          }

          await this.addImage(doc, slide.base64, width, height, quality);
          validSlides++;
          onProgress?.(Math.round(((i + 1) / slides.length) * 100));
        }
      }

      // 如果没有有效的幻灯片，抛出错误
      if (validSlides === 0) {
        throw new Error('No completed slides to export');
      }

      // 保存文件
      doc.save(fileName);
    } catch (error) {
      throw new Error(`PDF export failed: ${error.message}`);
    }
  }

  /**
   * 获取 PDF 配置
   */
  private getPDFConfig(aspectRatio: AspectRatio): {
    width: number;
    height: number;
    orientation: 'p' | 'l';
  } {
    switch (aspectRatio) {
      case '16:9':
        return { width: 1920, height: 1080, orientation: 'l' };
      case '4:3':
        return { width: 1440, height: 1080, orientation: 'l' };
      case '1:1':
        return { width: 1440, height: 1440, orientation: 'p' };
      case '3:4':
        return { width: 1080, height: 1440, orientation: 'p' };
      case '9:16':
        return { width: 1080, height: 1920, orientation: 'p' };
      default:
        return { width: 1920, height: 1080, orientation: 'l' };
    }
  }

  /**
   * 添加图片到 PDF
   */
  private async addImage(
    doc: any,
    base64: string,
    width: number,
    height: number,
    quality: number
  ): Promise<void> {
    return new Promise((resolve) => {
      // 添加图片（自动检测格式）
      doc.addImage(
        base64,
        'PNG', // 自动检测
        0,
        0,
        width,
        height,
        undefined,
        'FAST', // 压缩级别
        0 // 旋转角度
      );

      resolve();
    });
  }
}

// ==================== Singleton Instance ====================

let pdfService: PDFExportService | null = null;

export const getPDFExportService = (): PDFExportService => {
  if (!pdfService) {
    pdfService = new PDFExportService();
  }
  return pdfService;
};
