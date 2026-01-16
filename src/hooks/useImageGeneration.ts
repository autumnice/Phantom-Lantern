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
}

// ==================== Main Hook ====================

export function useImageGeneration(): UseImageGenerationReturn {
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
      const skipStatuses = ['generating', 'retrying', 'done'];
      if (!isManual && retryCount === 0 && currentSlide && skipStatuses.includes(currentSlide.status)) {
        console.log(`Slide ${id} is already ${currentSlide.status}, skipping...`);
        return false;
      }

      updateSlideStatus(id, {
        status: retryCount > 0 ? 'retrying' : 'generating',
        retryCount,
        errorMsg: undefined,
        base64: isManual && retryCount === 0 ? null : currentSlide?.base64,
      });

      try {
        const response = await apiClient.generateImage({
          prompt,
          aspectRatio: configRef.current.aspectRatio,
          imageSize: specificSize || configRef.current.imageSize,
        });

        updateSlideStatus(id, { status: 'done', base64: response.imageBase64, prompt, errorMsg: undefined });
        return true;
      } catch (error) {
        console.error(`Slide ${id} Error (Attempt ${retryCount}):`, error);

        if (error instanceof ApiError && error.isRetryable && retryCount < MAX_RETRIES) {
          const backoffMs = Math.min(Math.pow(2, retryCount) * 4000 + Math.random() * 2000, MAX_BACKOFF_MS);
          console.log(`Retrying slide ${id} in ${Math.round(backoffMs / 1000)}s...`);
          updateSlideStatus(id, { status: 'retrying', errorMsg: `服务器繁忙，${Math.round(backoffMs / 1000)}s 后重试...` });
          await sleep(backoffMs);
          return generateSingleSlide(id, prompt, { retryCount: retryCount + 1, isManual, version, specificSize });
        }

        updateSlideStatus(id, {
          status: 'error',
          errorMsg: error instanceof ApiError ? error.userMessage : '生成失败，请重试',
        });
        return false;
      }
    },
    [dispatch, syncRefs, updateSlideStatus]
  );

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

        const success = await generateSingleSlide(slide.id, slide.prompt, { version });

        console.log(`Slide ${slide.id} generation ${success ? 'succeeded' : 'failed'}`);

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

  return {
    generateAllSlides,
    generateSingleSlide,
  };
}
