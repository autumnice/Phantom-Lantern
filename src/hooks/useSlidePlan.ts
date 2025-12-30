import { useCallback } from 'react';
import { useAppContext } from '../context';
import { getGeminiService } from '../services';
import type { SlidePlan, InputConfig } from '../types';

// ==================== Hook Interface ====================

export interface UseSlidePlanReturn {
  // 生成大纲
  generatePlan: (config: InputConfig) => Promise<SlidePlan[]>;

  // 更新单个大纲项
  updatePlanItem: (index: number, updates: Partial<SlidePlan>) => void;

  // 更新整个大纲
  updatePlan: (plan: SlidePlan[]) => void;

  // 添加新的大纲项
  addPlanItem: (item: SlidePlan) => void;

  // 删除大纲项
  removePlanItem: (index: number) => void;

  // 重新排序大纲项
  reorderPlan: (fromIndex: number, toIndex: number) => void;
}

// ==================== Main Hook ====================

export const useSlidePlan = (): UseSlidePlanReturn => {
  const { dispatch } = useAppContext();

  // 生成大纲
  const generatePlan = useCallback(async (config: InputConfig): Promise<SlidePlan[]> => {
    const {
      text,
      slideCount,
      aspectRatio,
      selectedStyleId,
      customStylePrompt,
      detailLevelId
    } = config;

    // 验证输入
    if (!text.trim()) {
      throw new Error('请输入内容或链接');
    }

    // 获取风格配置
    const styleObj = selectedStyleId === 'custom'
      ? { name: '自定义', prompt: customStylePrompt }
      : { name: '预设', prompt: '' }; // 实际风格在prompt中处理

    // 获取详细度配置
    const detailObj = { id: detailLevelId, name: detailLevelId };

    try {
      // 获取 Gemini 服务
      const gemini = getGeminiService(process.env.GEMINI_API_KEY!);

      // 生成大纲
      const plan = await gemini.generatePlan({
        slideCount,
        aspectRatio,
        stylePrompt: styleObj.prompt,
        detailLevel: detailObj.name,
        content: text,
        useSearch: text.includes('http')
      });

      // 保存到状态
      dispatch({ type: 'SET_PLAN', payload: plan });

      return plan;
    } catch (error) {
      console.error('Generate plan error:', error);
      throw error;
    }
  }, [dispatch]);

  // 更新单个大纲项
  const updatePlanItem = useCallback((
    index: number,
    updates: Partial<SlidePlan>
  ) => {
    dispatch({
      type: 'UPDATE_PLAN_ITEM',
      payload: { index, updates }
    });
  }, [dispatch]);

  // 更新整个大纲
  const updatePlan = useCallback((plan: SlidePlan[]) => {
    dispatch({ type: 'SET_PLAN', payload: plan });
  }, [dispatch]);

  // 添加新的大纲项
  const addPlanItem = useCallback((item: SlidePlan) => {
    // 获取当前大纲
    const { state } = (() => {
      // 这里需要获取当前状态
      // 由于不能在回调中直接调用 useAppContext，
      // 这个函数需要在组件中使用
      throw new Error('Please use dispatch directly in component');
    })();

    // 实际实现应在组件中：
    // dispatch({ type: 'SET_PLAN', payload: [...currentPlan, item] });
  }, []);

  // 删除大纲项
  const removePlanItem = useCallback((index: number) => {
    // 实际实现应在组件中：
    // dispatch({
    //   type: 'SET_PLAN',
    //   payload: currentPlan.filter((_, i) => i !== index)
    // });
    console.warn('removePlanItem should be implemented in component');
  }, []);

  // 重新排序大纲项
  const reorderPlan = useCallback((fromIndex: number, toIndex: number) => {
    // 实际实现应在组件中：
    // const newPlan = [...currentPlan];
    // const [movedItem] = newPlan.splice(fromIndex, 1);
    // newPlan.splice(toIndex, 0, movedItem);
    // dispatch({ type: 'SET_PLAN', payload: newPlan });
    console.warn('reorderPlan should be implemented in component');
  }, []);

  return {
    generatePlan,
    updatePlanItem,
    updatePlan,
    addPlanItem,
    removePlanItem,
    reorderPlan
  };
};

// ==================== Helper Hooks ====================

/**
 * 获取大纲统计信息
 */
export const usePlanStats = (plan: SlidePlan[]) => {
  const totalSlides = plan.length;
  const totalCharacters = plan.reduce((sum, p) => sum + p.content.length, 0);
  const avgCharactersPerSlide = totalSlides > 0 ? Math.round(totalCharacters / totalSlides) : 0;

  return {
    totalSlides,
    totalCharacters,
    avgCharactersPerSlide
  };
};

/**
 * 验证大纲是否有效
 */
export const usePlanValidation = (plan: SlidePlan[]) => {
  const hasEmptyTitles = plan.some(p => !p.title.trim());
  const hasEmptyContent = plan.some(p => !p.content.trim());
  const isValid = plan.length > 0 && !hasEmptyTitles && !hasEmptyContent;

  return {
    isValid,
    hasEmptyTitles,
    hasEmptyContent,
    errors: {
      emptyTitles: hasEmptyTitles ? 'Some slides have empty titles' : null,
      emptyContent: hasEmptyContent ? 'Some slides have empty content' : null
    }
  };
};

/**
 * 将大纲转换为幻灯片图片配置
 */
export const usePlanToSlides = (
  plan: SlidePlan[],
  aspectRatio: AspectRatio,
  imageSize: ImageSize,
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
      retryCount: 0
    };
  });

  return slides;
};
