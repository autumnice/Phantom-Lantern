import { useCallback } from 'react';
import { useAppContext } from '../context';
import { apiClient, ApiError } from '../services/api';
import { STYLES } from '../constants';
import type { SlidePlan, InputConfig, AspectRatio, ImageSize } from '../types';

// ==================== Hook Interface ====================

export interface UseSlidePlanReturn {
  generatePlan: (config: InputConfig) => Promise<SlidePlan[]>;
  updatePlanItem: (index: number, updates: Partial<SlidePlan>) => void;
  updatePlan: (plan: SlidePlan[]) => void;
  addPlanItem: (item: SlidePlan) => void;
  removePlanItem: (index: number) => void;
  reorderPlan: (fromIndex: number, toIndex: number) => void;
}

// ==================== Main Hook ====================

export const useSlidePlan = (): UseSlidePlanReturn => {
  const { dispatch } = useAppContext();

  // 生成大纲 - 使用 API Client
  const generatePlan = useCallback(
    async (config: InputConfig): Promise<SlidePlan[]> => {
      const {
        text,
        slideCount,
        aspectRatio,
        selectedStyleId,
        customStylePrompt,
        detailLevelId,
      } = config;

      // 验证输入
      if (!text.trim()) {
        throw new Error('请输入内容或链接');
      }

      // 获取风格配置
      const styleObj =
        selectedStyleId === 'custom'
          ? { name: '自定义', prompt: customStylePrompt }
          : STYLES.find((s) => s.id === selectedStyleId) || STYLES[0];

      try {
        // 调用 API Client
        const response = await apiClient.generatePlan({
          content: text,
          slideCount,
          aspectRatio,
          stylePrompt: styleObj.prompt,
          detailLevel: detailLevelId,
          useSearch: text.includes('http'),
        });

        // 保存到状态
        dispatch({ type: 'SET_PLAN', payload: response.slides });

        return response.slides;
      } catch (error) {
        console.error('Generate plan error:', error);

        // 转换 ApiError 为兼容格式
        if (error instanceof ApiError) {
          const compatError = {
            message: error.userMessage,
            code: error.code,
            status: error.status,
          };
          throw compatError;
        }

        throw error;
      }
    },
    [dispatch]
  );

  // 更新单个大纲项
  const updatePlanItem = useCallback(
    (index: number, updates: Partial<SlidePlan>) => {
      dispatch({
        type: 'UPDATE_PLAN_ITEM',
        payload: { index, updates },
      });
    },
    [dispatch]
  );

  // 更新整个大纲
  const updatePlan = useCallback(
    (plan: SlidePlan[]) => {
      dispatch({ type: 'SET_PLAN', payload: plan });
    },
    [dispatch]
  );

  // 添加新的大纲项
  const addPlanItem = useCallback((_item: SlidePlan) => {
    console.warn('addPlanItem should be implemented in component');
  }, []);

  // 删除大纲项
  const removePlanItem = useCallback((_index: number) => {
    console.warn('removePlanItem should be implemented in component');
  }, []);

  // 重新排序大纲项
  const reorderPlan = useCallback((_fromIndex: number, _toIndex: number) => {
    console.warn('reorderPlan should be implemented in component');
  }, []);

  return {
    generatePlan,
    updatePlanItem,
    updatePlan,
    addPlanItem,
    removePlanItem,
    reorderPlan,
  };
};

// ==================== Helper Hooks ====================

/**
 * 获取大纲统计信息
 */
export const usePlanStats = (plan: SlidePlan[]) => {
  const totalSlides = plan.length;
  const totalCharacters = plan.reduce((sum, p) => sum + p.content.length, 0);
  const avgCharactersPerSlide =
    totalSlides > 0 ? Math.round(totalCharacters / totalSlides) : 0;

  return {
    totalSlides,
    totalCharacters,
    avgCharactersPerSlide,
  };
};

/**
 * 验证大纲是否有效
 */
export const usePlanValidation = (plan: SlidePlan[]) => {
  const hasEmptyTitles = plan.some((p) => !p.title.trim());
  const hasEmptyContent = plan.some((p) => !p.content.trim());
  const isValid = plan.length > 0 && !hasEmptyTitles && !hasEmptyContent;

  return {
    isValid,
    hasEmptyTitles,
    hasEmptyContent,
    errors: {
      emptyTitles: hasEmptyTitles ? 'Some slides have empty titles' : null,
      emptyContent: hasEmptyContent ? 'Some slides have empty content' : null,
    },
  };
};

/**
 * 将大纲转换为幻灯片图片配置
 */
export const usePlanToSlides = (
  plan: SlidePlan[],
  aspectRatio: AspectRatio,
  _imageSize: ImageSize,
  stylePrompt: string
) => {
  const slides = plan.map((p, index) => {
    const prompt = `High quality professional ${aspectRatio} presentation slide design.
                   Title: "${p.title}" (rendered in elegant Chinese).
                   Body: "${p.content}" (rendered in legible Chinese).
                   Style Theme: ${stylePrompt}.
                   Imagery: ${p.visualDescription}.
                   Ensure cinematic lighting, high resolution details, and a clean professional layout.`;

    return {
      id: p.id || index + 1,
      base64: null,
      status: 'pending' as const,
      prompt: prompt.trim(),
      retryCount: 0,
    };
  });

  return slides;
};
