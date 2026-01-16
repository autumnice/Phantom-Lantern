import { useCallback } from 'react';
import { useAppContext } from '../context';
import { apiClient, ApiError } from '../services/api';
import { STYLES } from '../constants';
import type { SlidePlan, InputConfig } from '../types';

// ==================== Hook Interface ====================

export interface UseSlidePlanReturn {
  generatePlan: (config: InputConfig) => Promise<SlidePlan[]>;
  updatePlanItem: (index: number, updates: Partial<SlidePlan>) => void;
  updatePlan: (plan: SlidePlan[]) => void;
}

// ==================== Main Hook ====================

export function useSlidePlan(): UseSlidePlanReturn {
  const { dispatch } = useAppContext();

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

      if (!text.trim()) {
        throw new Error('请输入内容或链接');
      }

      const styleObj =
        selectedStyleId === 'custom'
          ? { name: '自定义', prompt: customStylePrompt }
          : STYLES.find((s) => s.id === selectedStyleId) || STYLES[0];

      try {
        const response = await apiClient.generatePlan({
          content: text,
          slideCount,
          aspectRatio,
          stylePrompt: styleObj.prompt,
          detailLevel: detailLevelId,
          useSearch: text.includes('http'),
        });

        dispatch({ type: 'SET_PLAN', payload: response.slides });

        return response.slides;
      } catch (error) {
        console.error('Generate plan error:', error);

        if (error instanceof ApiError) {
          throw {
            message: error.userMessage,
            code: error.code,
            status: error.status,
          };
        }

        throw error;
      }
    },
    [dispatch]
  );

  const updatePlanItem = useCallback(
    (index: number, updates: Partial<SlidePlan>) => {
      dispatch({
        type: 'UPDATE_PLAN_ITEM',
        payload: { index, updates },
      });
    },
    [dispatch]
  );

  const updatePlan = useCallback(
    (plan: SlidePlan[]) => {
      dispatch({ type: 'SET_PLAN', payload: plan });
    },
    [dispatch]
  );

  return {
    generatePlan,
    updatePlanItem,
    updatePlan,
  };
}

// ==================== Helper Hooks ====================

/**
 * 获取大纲统计信息
 */
export function usePlanStats(plan: SlidePlan[]) {
  const totalSlides = plan.length;
  const totalCharacters = plan.reduce((sum, p) => sum + p.content.length, 0);
  const avgCharactersPerSlide =
    totalSlides > 0 ? Math.round(totalCharacters / totalSlides) : 0;

  return {
    totalSlides,
    totalCharacters,
    avgCharactersPerSlide,
  };
}
