import { useRef, useCallback } from 'react';
import { useAppContext } from '../context';
import { getGeminiService } from '../services';
import { sleep } from '../utils';
import type { SlideImage, ImageSize } from '../types';

// ==================== Configuration ====================

const MAX_RETRIES = 2; // 最大重试次数 (总尝试次数 = MAX_RETRIES + 1)
const MAX_BACKOFF_MS = 25000; // 最大退避时间 (25秒)

// ==================== Hook Interface ====================

export interface UseImageGenerationReturn {
  // 生成所有幻灯片
  generateAllSlides: (slides: SlideImage[], version: number) => Promise<void>;

  // 生成单张幻灯片
  generateSingleSlide: (
    id: number,
    prompt: string,
    options?: {
      retryCount?: number;
      isManual?: boolean;
      version?: number;
      specificSize?: ImageSize;
    }
  ) => Promise<boolean>;

  // 检查生成版本
  isCurrentVersion: (version: number) => boolean;
}

// ==================== Main Hook ====================

export const useImageGeneration = (): UseImageGenerationReturn => {
  const { state, dispatch } = useAppContext();

  // 使用 ref 跟踪当前状态，避免闭包问题
  const slidesRef = useRef(state.slides);
  const configRef = useRef(state.inputConfig);

  // 同步状态到 ref
  const syncRefs = useCallback(() => {
    slidesRef.current = state.slides;
    configRef.current = state.inputConfig;
  }, [state.slides, state.inputConfig]);

  // 更新单张幻灯片状态
  const updateSlideStatus = useCallback((
    id: number,
    updates: Partial<SlideImage>
  ) => {
    dispatch({
      type: 'UPDATE_SLIDE',
      payload: { id, updates }
    });
  }, [dispatch]);

  // 生成单张幻灯片
  const generateSingleSlide = useCallback(async (
    id: number,
    prompt: string,
    options: {
      retryCount?: number;
      isManual?: boolean;
      version?: number;
      specificSize?: ImageSize;
    } = {}
  ): Promise<boolean> => {
    const {
      retryCount = 0,
      isManual = false,
      version = 0,
      specificSize
    } = options;

    // 同步状态
    syncRefs();

    // 版本检查
    if (version && version !== 0) {
      // 版本检查逻辑将在调用时处理
    }

    // 状态保护：防止重复生成
    const currentSlide = slidesRef.current.find(s => s.id === id);
    if (
      !isManual &&
      retryCount === 0 &&
      (currentSlide?.status === 'generating' ||
       currentSlide?.status === 'retrying' ||
       currentSlide?.status === 'done')
    ) {
      console.log(`Slide ${id} is already ${currentSlide?.status}, skipping...`);
      return false;
    }

    // 设置生成中状态
    updateSlideStatus(id, {
      status: retryCount > 0 ? 'retrying' : 'generating',
      retryCount,
      errorMsg: undefined,
      // 手动重新生成时清空 base64
      base64: (isManual && retryCount === 0) ? null : currentSlide?.base64
    });

    try {
      // 获取 Gemini 服务
      const gemini = getGeminiService(process.env.GEMINI_API_KEY!);

      // 生成图片
      const base64 = await gemini.generateImage({
        prompt,
        aspectRatio: configRef.current.aspectRatio,
        imageSize: specificSize || configRef.current.imageSize
      });

      // 更新成功状态
      updateSlideStatus(id, {
        status: 'done',
        base64,
        prompt,
        errorMsg: undefined
      });

      return true;
    } catch (error: any) {
      console.error(`Slide ${id} Error (Attempt ${retryCount}):`, error);

      // 检查是否是计费/权限错误
      if (error.code === 'BILLING_NOT_ENABLED') {
        updateSlideStatus(id, {
          status: 'error',
          errorMsg: 'API权限不足/计费未开启'
        });
        return false;
      }

      // 检查是否是服务器过载
      const isOverloaded = error.code === 'SERVER_OVERLOADED' ||
                          error.status === 503 ||
                          (error.message && (
                            error.message.includes('503') ||
                            error.message.includes('overloaded') ||
                            error.message.includes('UNAVAILABLE')
                          ));

      // 重试逻辑
      if (isOverloaded && retryCount < MAX_RETRIES) {
        // 指数退避 + 抖动
        const baseMs = Math.pow(2, retryCount) * 4000; // 4s, 8s, 16s
        const jitter = Math.random() * 2000; // 0-2s 随机抖动
        const backoffMs = Math.min(baseMs + jitter, MAX_BACKOFF_MS);

        console.log(`Retrying slide ${id} in ${Math.round(backoffMs / 1000)}s...`);

        // 更新重试状态
        updateSlideStatus(id, {
          status: 'retrying',
          errorMsg: `服务器繁忙，${Math.round(backoffMs / 1000)}s 后重试...`
        });

        // 等待后退时间
        await sleep(backoffMs);

        // 递归重试
        return generateSingleSlide(id, prompt, {
          retryCount: retryCount + 1,
          isManual,
          version,
          specificSize
        });
      }

      // 最终失败
      const errorMsg = isOverloaded
        ? '服务器过载，请尝试手动重试或降低画质'
        : '生成失败，可能是内容受限或API错误';

      updateSlideStatus(id, {
        status: 'error',
        errorMsg
      });

      return false;
    }
  }, [dispatch, syncRefs]);

  // 生成所有幻灯片（顺序）
  const generateAllSlides = useCallback(async (
    slides: SlideImage[],
    version: number
  ): Promise<void> => {
    // 同步状态
    syncRefs();

    console.log(`Starting generation of ${slides.length} slides, version: ${version}`);

    // 顺序处理每张幻灯片
    for (let i = 0; i < slides.length; i++) {
      // 版本检查
      if (version !== 0) {
        // 版本检查将在调用时处理
      }

      const slide = slides[i];
      const currentSlide = slidesRef.current.find(s => s.id === slide.id);

      // 跳过已完成的幻灯片
      if (currentSlide?.status === 'done') {
        console.log(`Slide ${slide.id} already done, skipping...`);
        continue;
      }

      // 生成单张幻灯片
      const success = await generateSingleSlide(slide.id, slide.prompt, {
        version
      });

      console.log(`Slide ${slide.id} generation ${success ? 'succeeded' : 'failed'}`);

      // 请求间隔冷却
      if (i < slides.length - 1) {
        const cooldown = configRef.current.imageSize === '4K' ? 10000 : 4000;
        console.log(`Cooling down for ${cooldown}ms...`);
        await sleep(cooldown);
      }
    }

    console.log('All slides generation completed');
  }, [generateSingleSlide, syncRefs]);

  // 检查是否是当前版本
  const isCurrentVersion = useCallback((version: number): boolean => {
    // 这个逻辑将在调用时实现
    return true;
  }, []);

  return {
    generateAllSlides,
    generateSingleSlide,
    isCurrentVersion
  };
};

// ==================== Helper Hooks ====================

/**
 * 检查是否可以开始生成
 */
export const useCanGenerate = (slides: SlideImage[]): boolean => {
  return slides.length > 0 && slides.every(slide =>
    slide.status === 'pending' || slide.status === 'error'
  );
};

/**
 * 获取生成统计信息
 */
export const useGenerationStats = (slides: SlideImage[]) => {
  const total = slides.length;
  const completed = slides.filter(s => s.status === 'done').length;
  const generating = slides.filter(s => s.status === 'generating').length;
  const retrying = slides.filter(s => s.status === 'retrying').length;
  const errors = slides.filter(s => s.status === 'error').length;
  const pending = slides.filter(s => s.status === 'pending').length;

  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  return {
    total,
    completed,
    generating,
    retrying,
    errors,
    pending,
    progress
  };
};

/**
 * 获取下一张待生成的幻灯片
 */
export const useNextPendingSlide = (slides: SlideImage[]): SlideImage | undefined => {
  return slides.find(slide =>
    slide.status === 'pending' || slide.status === 'error'
  );
};
