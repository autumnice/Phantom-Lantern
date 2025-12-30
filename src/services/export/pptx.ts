import type { SlideImage, AspectRatio } from '../../types';

// ==================== Interfaces ====================

export interface PPTXExportOptions {
  slides: SlideImage[];
  aspectRatio: AspectRatio;
  fileName?: string;
  onProgress?: (progress: number) => void;
}

// ==================== Main Service ====================

export class PPTXExportService {
  private pptx: any;

  constructor() {
    // 检查 PptxGenJS 是否可用
    if (typeof window === 'undefined' || !(window as any).PptxGenJS) {
      throw new Error('PptxGenJS is not loaded. Please include the library.');
    }
    this.pptx = new (window as any).PptxGenJS();
  }

  /**
   * 导出到 PPTX
   */
  async export(options: PPTXExportOptions): Promise<void> {
    const { slides, aspectRatio, fileName = `NanoDeck-${Date.now()}.pptx` } = options;

    try {
      // 配置页面比例
      this.configureLayout(aspectRatio);

      // 添加幻灯片
      for (let i = 0; i < slides.length; i++) {
        const slide = slides[i];
        if (slide.base64 && slide.status === 'done') {
          await this.addSlide(slide, i);
          options.onProgress?.(Math.round(((i + 1) / slides.length) * 100));
        }
      }

      // 下载文件
      await this.pptx.writeFile({ fileName });
    } catch (error) {
      throw new Error(`PPTX export failed: ${error.message}`);
    }
  }

  /**
   * 配置页面布局
   */
  private configureLayout(aspectRatio: AspectRatio): void {
    switch (aspectRatio) {
      case '16:9':
        this.pptx.layout = 'LAYOUT_16x9';
        break;
      case '4:3':
        this.pptx.layout = 'LAYOUT_4x3';
        break;
      case '1:1':
        this.pptx.defineLayout({ name: 'SQUARE', width: 10, height: 10 });
        this.pptx.layout = 'SQUARE';
        break;
      case '3:4':
        this.pptx.defineLayout({ name: 'PORTRAIT_3_4', width: 7.5, height: 10 });
        this.pptx.layout = 'PORTRAIT_3_4';
        break;
      case '9:16':
        this.pptx.defineLayout({ name: 'PORTRAIT_9_16', width: 5.625, height: 10 });
        this.pptx.layout = 'PORTRAIT_9_16';
        break;
      default:
        this.pptx.layout = 'LAYOUT_16x9';
    }
  }

  /**
   * 添加单张幻灯片
   */
  private async addSlide(slide: SlideImage, index: number): Promise<void> {
    return new Promise((resolve) => {
      const pptSlide = this.pptx.addSlide();

      // 设置背景图片
      pptSlide.background = { data: slide.base64 };

      // 添加幻灯片编号（可选）
      // pptSlide.addText(`#${slide.id}`, {
      //   x: 0.5,
      //   y: 0.5,
      //   fontSize: 12,
      //   color: 'FFFFFF',
      //   bold: true
      // });

      resolve();
    });
  }
}

// ==================== Singleton Instance ====================

let pptxService: PPTXExportService | null = null;

export const getPPTXExportService = (): PPTXExportService => {
  if (!pptxService) {
    pptxService = new PPTXExportService();
  }
  return pptxService;
};
