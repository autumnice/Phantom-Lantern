import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import type {
  SlidePlan,
  SlideImage,
  InputConfig,
  AppStep,
  ImageSize,
  StyleConfig,
  DetailLevel
} from '../types';
import { STYLES, DETAIL_LEVELS } from '../constants';

// ==================== State Interface ====================

export interface AppState {
  // API Key 状态
  hasKey: boolean | null;

  // 应用步骤
  step: AppStep;

  // 加载状态
  isLoading: boolean;
  loadingMessage: string;

  // 输入配置
  inputConfig: InputConfig;

  // 生成状态
  plan: SlidePlan[];
  slides: SlideImage[];

  // UI 状态
  showResetConfirm: boolean;
  editingSlideId: number | null;
  tempImageSize: ImageSize;

  // 生成版本（用于取消过期的生成任务）
  generationVersion: number;
}

// ==================== Initial State ====================

const initialInputConfig: InputConfig = {
  text: '',
  slideCount: 5,
  aspectRatio: '16:9',
  imageSize: '1K',
  selectedStyleId: STYLES[0].id,
  customStylePrompt: '',
  detailLevelId: DETAIL_LEVELS[1].id
};

export const initialState: AppState = {
  hasKey: null,
  step: 'input',
  isLoading: false,
  loadingMessage: '',
  inputConfig: initialInputConfig,
  plan: [],
  slides: [],
  showResetConfirm: false,
  editingSlideId: null,
  tempImageSize: '1K',
  generationVersion: 0
};

// ==================== Actions ====================

export type AppAction =
  // API Key
  | { type: 'SET_HAS_KEY'; payload: boolean }

  // 步骤控制
  | { type: 'SET_STEP'; payload: AppStep }
  | { type: 'RESET_ALL' }

  // 加载状态
  | { type: 'SET_LOADING'; payload: { isLoading: boolean; message?: string } }

  // 输入配置
  | { type: 'UPDATE_INPUT_CONFIG'; payload: Partial<InputConfig> }
  | { type: 'SET_INPUT_CONFIG'; payload: InputConfig }

  // 大纲
  | { type: 'SET_PLAN'; payload: SlidePlan[] }
  | { type: 'UPDATE_PLAN_ITEM'; payload: { index: number; updates: Partial<SlidePlan> } }

  // 幻灯片
  | { type: 'SET_SLIDES'; payload: SlideImage[] }
  | { type: 'UPDATE_SLIDE'; payload: { id: number; updates: Partial<SlideImage> } }
  | { type: 'ADD_SLIDE'; payload: SlideImage }
  | { type: 'REMOVE_SLIDE'; payload: number }

  // UI 状态
  | { type: 'SET_SHOW_RESET_CONFIRM'; payload: boolean }
  | { type: 'SET_EDITING_SLIDE_ID'; payload: number | null }
  | { type: 'SET_TEMP_IMAGE_SIZE'; payload: ImageSize }

  // 生成版本
  | { type: 'INCREMENT_GENERATION_VERSION' };

// ==================== Reducer ====================

export const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    // API Key
    case 'SET_HAS_KEY':
      return { ...state, hasKey: action.payload };

    // 步骤控制
    case 'SET_STEP':
      return { ...state, step: action.payload };

    case 'RESET_ALL':
      return {
        ...initialState,
        hasKey: state.hasKey // 保留 API Key 状态
      };

    // 加载状态
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload.isLoading,
        loadingMessage: action.payload.message || ''
      };

    // 输入配置
    case 'UPDATE_INPUT_CONFIG':
      return {
        ...state,
        inputConfig: { ...state.inputConfig, ...action.payload }
      };

    case 'SET_INPUT_CONFIG':
      return { ...state, inputConfig: action.payload };

    // 大纲
    case 'SET_PLAN':
      return { ...state, plan: action.payload };

    case 'UPDATE_PLAN_ITEM':
      return {
        ...state,
        plan: state.plan.map((item, index) =>
          index === action.payload.index
            ? { ...item, ...action.payload.updates }
            : item
        )
      };

    // 幻灯片
    case 'SET_SLIDES':
      return { ...state, slides: action.payload };

    case 'UPDATE_SLIDE': {
      const { id, updates } = action.payload;
      return {
        ...state,
        slides: state.slides.map(slide =>
          slide.id === id ? { ...slide, ...updates } : slide
        )
      };
    }

    case 'ADD_SLIDE':
      return { ...state, slides: [...state.slides, action.payload] };

    case 'REMOVE_SLIDE':
      return {
        ...state,
        slides: state.slides.filter(slide => slide.id !== action.payload)
      };

    // UI 状态
    case 'SET_SHOW_RESET_CONFIRM':
      return { ...state, showResetConfirm: action.payload };

    case 'SET_EDITING_SLIDE_ID':
      return { ...state, editingSlideId: action.payload };

    case 'SET_TEMP_IMAGE_SIZE':
      return { ...state, tempImageSize: action.payload };

    // 生成版本
    case 'INCREMENT_GENERATION_VERSION':
      return { ...state, generationVersion: state.generationVersion + 1 };

    default:
      return state;
  }
};

// ==================== Context ====================

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

// ==================== Provider ====================

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
};

// ==================== Hook ====================

export const useAppContext = (): AppContextValue => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

// ==================== Selectors ====================

// 获取当前风格配置
export const useCurrentStyle = (state: AppState): StyleConfig => {
  const { selectedStyleId, customStylePrompt } = state.inputConfig;

  if (selectedStyleId === 'custom') {
    return {
      id: 'custom',
      name: '自定义',
      prompt: customStylePrompt
    };
  }

  return (
    STYLES.find(s => s.id === selectedStyleId) || STYLES[0]
  );
};

// 获取当前详细度配置
export const useCurrentDetailLevel = (state: AppState): DetailLevel => {
  return (
    DETAIL_LEVELS.find(d => d.id === state.inputConfig.detailLevelId) ||
    DETAIL_LEVELS[1]
  );
};

// 获取幻灯片总数
export const useSlideCount = (state: AppState): number => {
  return state.inputConfig.slideCount;
};

// 获取已完成幻灯片数
export const useCompletedSlidesCount = (state: AppState): number => {
  return state.slides.filter(slide => slide.status === 'done').length;
};

// 获取生成进度百分比
export const useGenerationProgress = (state: AppState): number => {
  if (state.slides.length === 0) return 0;
  const completed = useCompletedSlidesCount(state);
  return Math.round((completed / state.slides.length) * 100);
};

// 检查是否有错误
export const useHasErrors = (state: AppState): boolean => {
  return state.slides.some(slide => slide.status === 'error');
};

// 检查是否所有幻灯片都已完成
export const useAllSlidesCompleted = (state: AppState): boolean => {
  return state.slides.length > 0 &&
         state.slides.every(slide => slide.status === 'done');
};
