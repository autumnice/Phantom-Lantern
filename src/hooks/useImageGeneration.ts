import { useRef, useCallback } from 'react';
import { useAppContext } from '../context';
import { apiClient, ApiError } from '../services/api';
import { sleep } from '../utils';
import type { SlideImage, ImageSize } from '../types';

// ==================== Configuration ====================

const MAX_RETRIES = 2;
const MAX_BACKOFF_MS = 25000;

// ==================== Hook Interface ====================

export interface UseImageGenerationReturn {
  generateAllSlides: (slides: SlideImage[], version: number) => Promise<void>;
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
  isCurrentVersion: (version: number) => boolean;
}

// ==================== Main Hook ====================

export const useImageGeneration = (): UseImageGenerationReturn => {
  const { state, dispatch } = useAppContext();

  const slidesRef = useRef(state.slides);
  const configRef = useRef(state.inputConfig);

  const syncRefs = useCallback(() => {
    slidesRef.current = state.slides;
    configRef.current = state.inputConfig;
  }, [state.slides, state.inputConfig]);

  const updateSlideStatus = useCallback(
    (id: number, updates: Partial<SlideImage>) => {
      dispatch({
        type: 'UPDATE_SLIDE',
        payload: { id, updates },
      });
    },
    [dispatch]
  );

  // 生成单张幻灯片 - 使用 API Client
  const generateSingleSlide = useCallback(
    async (
      id: number,
      prompt: string,
      options: {
        retryCount?: number;
        isManual?: boolean;
        version?: number;
        specificSize?: ImageSize;
      } = {}
    ): Promise<boolean> => {
      const { retryCount = 0, isManual = false, version = 0, specificSize } = options;

      syncRefs();

      const currentSlide = slidesRef.current.find((s) => s.id === id);
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

      updateSlideStatus(id, {
        status: retryCount > 0 ? 'retrying' : 'generating',
        retryCount,
        errorMsg: undefined,
        base64: isManual && retryCount === 0 ? null : currentSlide?.base64,
      });

      try {
        // 调用 API Client
        const response = await apiClient.generateImage({
          prompt,
          aspectRatio: configRef.current.aspectRatio,
          imageSize: specificSize || configRef.current.imageSize,
        });

        updateSlideStatus(id, {
          status: 'done',
          base64: response.imageBase64,
          prompt,
          errorMsg: undefined,
        });

        return true;
      } catch (error) {
        console.error(`Slide ${id} Error (Attempt ${retryCount}):`, error);

        // 处理 ApiError
        if (error instanceof ApiError) {
          // 检查是否可重试
          if (error.isRetryable && retryCount < MAX_RETRIES) {
            const baseMs = Math.pow(2, retryCount) * 4000;
            const jitter = Math.random() * 2000;
            const backoffMs = Math.min(baseMs + jitter, MAX_BACKOFF_MS);

            console.log(`Retrying slide ${id} in ${Math.round(backoffMs / 1000)}s...`);

            updateSlideStatus(id, {
              status: 'retrying',
              errorMsg: `服务器繁忙，${Math.round(backoffMs / 1000)}s 后重试...`,
            });

            await sleep(backoffMs);

            return generateSingleSlide(id, prompt, {
              retryCount: retryCount + 1,
              isManual,
              version,
              specificSize,
            });
          }

          // 最终失败
          updateSlideStatus(id, {
            status: 'error',
            errorMsg: error.userMessage,
          });

          return false;
        }

        // 非 ApiError
        updateSlideStatus(id, {
          status: 'error',
          errorMsg: '生成失败，请重试',
        });

        return false;
      }
    },
    [dispatch, syncRefs, updateSlideStatus]
  );

  // 生成所有幻灯片（顺序）
  const generateAllSlides = useCallback(
    async (slides: SlideImage[], version: number): Promise<void> => {
      syncRefs();

      console.log(`Starting generation of ${slides.length} slides, version: ${version}`);

      for (let i = 0; i < slides.length; i++) {
        const slide = slides[i];
        const currentSlide = slidesRef.current.find((s) => s.id === slide.id);

        if (currentSlide?.status === 'done') {
          console.log(`Slide ${slide.id} already done, skipping...`);
          continue;
        }

        const success = await generateSingleSlide(slide.id, slide.prompt, {
          version,
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
    },
    [generateSingleSlide, syncRefs]
  );

  const isCurrentVersion = useCallback((_version: number): boolean => {
    return true;
  }, []);

  return {
    generateAllSlides,
    generateSingleSlide,
    isCurrentVersion,
  };
};

// ==================== Helper Hooks ====================

export const useCanGenerate = (slides: SlideImage[]): boolean => {
  return (
    slides.length > 0 &&
    slides.every((slide) => slide.status === 'pending' || slide.status === 'error')
  );
};

export const useGenerationStats = (slides: SlideImage[]) => {
  const total = slides.length;
  const completed = slides.filter((s) => s.status === 'done').length;
  const generating = slides.filter((s) => s.status === 'generating').length;
  const retrying = slides.filter((s) => s.status === 'retrying').length;
  const errors = slides.filter((s) => s.status === 'error').length;
  const pending = slides.filter((s) => s.status === 'pending').length;

  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  return {
    total,
    completed,
    generating,
    retrying,
    errors,
    pending,
    progress,
  };
};

export const useNextPendingSlide = (slides: SlideImage[]): SlideImage | undefined => {
  return slides.find((slide) => slide.status === 'pending' || slide.status === 'error');
};
