# 前端实施详细计划

## 概述
基于主架构设计，创建高质量、模块化、可维护的前端应用。

## 技术栈
- React 19 + TypeScript
- Vite
- Tailwind CSS
- Axios
- React Context + useReducer

## 实施步骤

### 段 1: 项目初始化与基础配置

#### 1.1 创建项目结构
```
frontend/
├── public/
│   └── index.html
├── src/
│   ├── components/          # React 组件
│   │   ├── layout/         # 布局组件
│   │   ├── steps/          # 步骤组件
│   │   ├── slides/         # 幻灯片组件
│   │   └── common/         # 公共组件
│   ├── hooks/              # 自定义 Hooks
│   ├── services/           # API 服务
│   ├── types/              # TypeScript 类型
│   ├── constants/          # 常量
│   ├── utils/              # 工具函数
│   ├── context/            # React Context
│   ├── App.tsx             # 主应用
│   └── main.tsx            # 入口文件
├── package.json
├── vite.config.ts
├── tsconfig.json
└── tailwind.config.js
```

#### 1.2 安装依赖
```bash
npm install react@^19.2.1 react-dom@^19.2.1
npm install -D @types/react @types/react-dom typescript
npm install axios
npm install -D vite @vitejs/plugin-react
npm install -D tailwindcss postcss autoprefixer
```

#### 1.3 配置文件
- vite.config.ts
- tsconfig.json
- tailwind.config.js
- .env.example

### 阶段 2: TypeScript 类型定义

创建完整的类型系统：

```typescript
// types/index.ts
// 基础类型
export type AspectRatio = '16:9' | '4:3' | '1:1' | '3:4' | '9:16';
export type ImageSize = '1K' | '2K' | '4K';
export type AppStep = 'input' | 'planning' | 'preview';
export type SlideStatus = 'pending' | 'generating' | 'done' | 'error' | 'retrying';

// 幻灯片计划
export interface SlidePlan {
  id: number;
  title: string;
  content: string;
  visualDescription: string;
}

// 幻灯片图片
export interface SlideImage {
  id: number;
  base64: string | null;
  status: SlideStatus;
  prompt: string;
  retryCount: number;
}

// 输入配置
export interface InputConfig {
  text: string;
  slideCount: number;
  aspectRatio: AspectRatio;
  imageSize: ImageSize;
  selectedStyleId: string;
  customStylePrompt: string;
  detailLevelId: string;
}

// 风格配置
export interface StyleConfig {
  id: string;
  name: string;
  prompt: string;
}

// 详细度配置
export interface DetailLevel {
  id: string;
  name: string;
  description: string;
}

// API 请求/响应类型
export interface GeneratePlanRequest {
  content: string;
  slideCount: number;
  aspectRatio: string;
  stylePrompt: string;
  detailLevel: string;
  useSearch?: boolean;
}

export interface GeneratePlanResponse {
  slides: SlidePlan[];
}

export interface GenerateImageRequest {
  prompt: string;
  aspectRatio: string;
  imageSize: string;
}

export interface GenerateImageResponse {
  imageBase64: string;
}

export interface ExportRequest {
  slides: SlideImage[];
  aspectRatio: string;
}

export interface ExportResponse {
  fileUrl: string;
}

// 应用状态
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

  // 生成版本（用于取消过期的生成任务）
  generationVersion: number;
}

// 应用动作
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

  // 生成版本
  | { type: 'INCREMENT_GENERATION_VERSION' };
```

### 阶段 3: API 服务层

#### 3.1 创建 API 客户端
```typescript
// services/api/client.ts
import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
apiClient.interceptors.request.use(
  (config) => {
    // 可以在这里添加认证 token
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // 统一错误处理
    if (error.response?.status === 404) {
      console.error('API not found');
    } else if (error.response?.status === 500) {
      console.error('Server error');
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

#### 3.2 Presentation API 服务
```typescript
// services/api/presentation.ts
import apiClient from './client';
import type {
  GeneratePlanRequest,
  GeneratePlanResponse,
  GenerateImageRequest,
  GenerateImageResponse,
  ExportRequest,
  ExportResponse,
} from '../../types';

export const presentationApi = {
  generatePlan: async (data: GeneratePlanRequest): Promise<GeneratePlanResponse> => {
    const response = await apiClient.post<GeneratePlanResponse>(
      '/api/v1/presentations/plan',
      data
    );
    return response.data;
  },

  generateImage: async (data: GenerateImageRequest): Promise<GenerateImageResponse> => {
    const response = await apiClient.post<GenerateImageResponse>(
      '/api/v1/presentations/generate-image',
      data
    );
    return response.data;
  },

  exportToPPTX: async (data: ExportRequest): Promise<ExportResponse> => {
    const response = await apiClient.post<ExportResponse>(
      '/api/v1/presentations/export/pptx',
      data
    );
    return response.data;
  },

  exportToPDF: async (data: ExportRequest): Promise<ExportResponse> => {
    const response = await apiClient.post<ExportResponse>(
      '/api/v1/presentations/export/pdf',
      data
    );
    return response.data;
  },
};
```

### 阶段 4: 自定义 Hooks

#### 4.1 使用 Slide Plan
```typescript
// hooks/useSlidePlan.ts
import { useState, useCallback } from 'react';
import { presentationApi } from '../services/api/presentation';
import type { InputConfig, SlidePlan } from '../types';

export const useSlidePlan = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generatePlan = useCallback(async (config: InputConfig): Promise<SlidePlan[]> => {
    setLoading(true);
    setError(null);

    try {
      const styleObj = config.selectedStyleId === 'custom'
        ? { name: '自定义', prompt: config.customStylePrompt }
        : STYLES.find(s => s.id === config.selectedStyleId) || STYLES[0];

      const response = await presentationApi.generatePlan({
        content: config.text,
        slideCount: config.slideCount,
        aspectRatio: config.aspectRatio,
        stylePrompt: styleObj.prompt,
        detailLevel: config.detailLevelId,
        useSearch: false,
      });

      return response.slides;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { generatePlan, loading, error };
};
```

#### 4.2 图片生成 Hook
```typescript
// hooks/useImageGeneration.ts
import { useState, useCallback } from 'react';
import { presentationApi } from '../services/api/presentation';
import type { SlideImage, AspectRatio, ImageSize } from '../types';

export const useImageGeneration = () => {
  const [generatingIds, setGeneratingIds] = useState<Set<number>>(new Set());
  const [errors, setErrors] = useState<Record<number, string>>({});

  const generateSingleImage = useCallback(async (
    slideId: number,
    prompt: string,
    aspectRatio: AspectRatio,
    imageSize: ImageSize
  ): Promise<string> => {
    setGeneratingIds(prev => new Set(prev).add(slideId));
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[slideId];
      return newErrors;
    });

    try {
      const response = await presentationApi.generateImage({
        prompt,
        aspectRatio,
        imageSize,
      });
      return response.imageBase64;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate image';
      setErrors(prev => ({ ...prev, [slideId]: errorMessage }));
      throw error;
    } finally {
      setGeneratingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(slideId);
        return newSet;
      });
    }
  }, []);

  return {
    generateSingleImage,
    generatingIds,
    errors,
  };
};
```

### 阶段 5: 公共组件

#### 5.1 Button 组件
```typescript
// components/common/Button.tsx
import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background',
  {
    variants: {
      variant: {
        default: 'bg-indigo-600 text-white hover:bg-indigo-700',
        outline: 'border border-gray-300 text-gray-300 hover:bg-gray-800',
        ghost: 'text-gray-300 hover:bg-gray-800',
        danger: 'bg-red-600 text-white hover:bg-red-700',
      },
      size: {
        default: 'h-10 py-2 px-4',
        sm: 'h-9 px-3 rounded-md',
        lg: 'h-11 px-8 rounded-md',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export default Button;
```

#### 5.2 Modal 组件
```typescript
// components/common/Modal.tsx
import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../utils/cn';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, className }) => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      <div className={cn(
        'relative bg-gray-900 rounded-lg shadow-xl max-w-lg w-full mx-4',
        className
      )}>
        {title && (
          <div className="flex items-center justify-between p-6 border-b border-gray-800">
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>,
    document.body
  );
};

export default Modal;
```

### 阶段 6: 主要组件

#### 6.1 InputStep 组件
```typescript
// components/steps/InputStep.tsx
import React, { useState } from 'react';
import Button from '../common/Button';
import type { InputConfig } from '../../types';

interface InputStepProps {
  config: InputConfig;
  onConfigChange: (config: InputConfig) => void;
  onSubmit: () => void;
}

const InputStep: React.FC<InputStepProps> = ({ config, onConfigChange, onSubmit }) => {
  const [text, setText] = useState(config.text);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfigChange({ ...config, text });
    onSubmit();
  };

  return (
    <div className="max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">
            输入内容或链接
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            rows={6}
            placeholder="输入您的演示文稿内容或粘贴链接..."
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              幻灯片数量
            </label>
            <select
              value={config.slideCount}
              onChange={(e) => onConfigChange({ ...config, slideCount: Number(e.target.value) })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white"
            >
              {[3, 5, 7, 10].map(n => (
                <option key={n} value={n}>{n} 张</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              纵横比
            </label>
            <select
              value={config.aspectRatio}
              onChange={(e) => onConfigChange({ ...config, aspectRatio: e.target.value as AspectRatio })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white"
            >
              <option value="16:9">16:9 (宽屏)</option>
              <option value="4:3">4:3 (标准)</option>
              <option value="1:1">1:1 (方形)</option>
            </select>
          </div>
        </div>

        <Button type="submit" size="lg" className="w-full">
          生成大纲
        </Button>
      </form>
    </div>
  );
};

export default InputStep;
```

#### 6.2 PlanningStep 组件
```typescript
// components/steps/PlanningStep.tsx
import React from 'react';
import Button from '../common/Button';
import type { SlidePlan } from '../../types';

interface PlanningStepProps {
  plan: SlidePlan[];
  onPlanChange: (plan: SlidePlan[]) => void;
  onBack: () => void;
  onGenerate: () => void;
}

const PlanningStep: React.FC<PlanningStepProps> = ({
  plan,
  onPlanChange,
  onBack,
  onGenerate
}) => {
  const updateSlide = (index: number, updates: Partial<SlidePlan>) => {
    const newPlan = [...plan];
    newPlan[index] = { ...newPlan[index], ...updates };
    onPlanChange(newPlan);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">演示文稿大纲</h2>
        <p className="text-gray-400">查看并编辑生成的幻灯片大纲</p>
      </div>

      <div className="space-y-4 mb-8">
        {plan.map((slide, index) => (
          <div key={slide.id} className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-lg font-semibold">幻灯片 {index + 1}</h3>
              <span className="text-sm text-gray-400">ID: {slide.id}</span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">标题</label>
                <input
                  type="text"
                  value={slide.title}
                  onChange={(e) => updateSlide(index, { title: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">内容</label>
                <textarea
                  value={slide.content}
                  onChange={(e) => updateSlide(index, { content: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">视觉描述</label>
                <textarea
                  value={slide.visualDescription}
                  onChange={(e) => updateSlide(index, { visualDescription: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white"
                  rows={2}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-4">
        <Button variant="outline" onClick={onBack}>
          返回
        </Button>
        <Button onClick={onGenerate} className="flex-1">
          开始生成图片
        </Button>
      </div>
    </div>
  );
};

export default PlanningStep;
```

### 阶段 7: Context 状态管理

```typescript
// context/AppContext.tsx
import React, { createContext, useContext, useReducer } from 'react';
import type { AppState, AppAction } from '../types';
import { initialState, appReducer } from './appReducer';

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
} | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
};
```

### 阶段 8: 主应用组件

```typescript
// App.tsx
import React from 'react';
import { AppProvider } from './context/AppContext';
import { useAppContext } from './context/AppContext';
import InputStep from './components/steps/InputStep';
import PlanningStep from './components/steps/PlanningStep';
import type { AppStep } from './types';

const AppContent: React.FC = () => {
  const { state, dispatch } = useAppContext();

  const handleConfigSubmit = async () => {
    // 使用 useSlidePlan hook
  };

  const renderStep = () => {
    switch (state.step) {
      case 'input':
        return (
          <InputStep
            config={state.inputConfig}
            onConfigChange={(config) => dispatch({ type: 'SET_INPUT_CONFIG', payload: config })}
            onSubmit={handleConfigSubmit}
          />
        );
      case 'planning':
        return (
          <PlanningStep
            plan={state.plan}
            onPlanChange={(plan) => dispatch({ type: 'SET_PLAN', payload: plan })}
            onBack={() => dispatch({ type: 'SET_STEP', payload: 'input' })}
            onGenerate={() => dispatch({ type: 'SET_STEP', payload: 'preview' })}
          />
        );
      // ... other steps
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <main className="container mx-auto px-4 py-8">
        {renderStep()}
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
};

export default App;
```

### 阶段 9: UI 设计系统实现

基于 frontend-design 插件创建独特的视觉风格：

#### 9.1 设计系统文件
```css
/* styles/index.css - 设计系统 */

/* 字体导入 */
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

/* CSS 变量 - 设计令牌 */
:root {
  /* 颜色系统 */
  --color-bg-primary: #0a0e1a;
  --color-bg-secondary: #1a1f2e;
  --color-bg-tertiary: #252b3c;
  --color-bg-quaternary: #2e3447;

  --color-accent-primary: #00d4ff;
  --color-accent-secondary: #ff2a6d;
  --color-accent-tertiary: #05ffa1;
  --color-accent-quaternary: #b967ff;

  --color-text-primary: #e0e0e0;
  --color-text-secondary: #a0a0a0;
  --color-text-muted: #606060;

  --color-success: #05ffa1;
  --color-warning: #ffb800;
  --color-error: #ff2a6d;
  --color-info: #00d4ff;

  /* 间距系统 */
  --space-xs: 0.25rem;
  --space-sm: 0.5rem;
  --space-md: 1rem;
  --space-lg: 1.5rem;
  --space-xl: 2rem;
  --space-2xl: 3rem;
  --space-3xl: 4rem;

  /* 阴影和光效 */
  --glow-primary: 0 0 20px rgba(0, 212, 255, 0.5);
  --glow-secondary: 0 0 20px rgba(255, 42, 109, 0.5);
  --shadow-card: 0 4px 6px rgba(0, 0, 0, 0.3);
  --shadow-modal: 0 10px 25px rgba(0, 0, 0, 0.5);

  /* 动画 */
  --ease-out: cubic-bezier(0.25, 0.46, 0.45, 0.94);
  --duration-fast: 150ms;
  --duration-normal: 300ms;
  --duration-slow: 500ms;

  /* 字体 */
  --font-display: 'Orbitron', sans-serif;
  --font-body: 'Space Grotesk', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
}

/* 背景动画效果 */
.bg-grid {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image:
    linear-gradient(rgba(0, 212, 255, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 212, 255, 0.05) 1px, transparent 1px);
  background-size: 50px 50px;
  animation: grid-move 20s linear infinite;
  pointer-events: none;
  z-index: -1;
}

@keyframes grid-move {
  0% { transform: translate(0, 0); }
  100% { transform: translate(50px, 50px); }
}

.bg-glow {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: radial-gradient(
    circle at 50% 50%,
    rgba(0, 212, 255, 0.1) 0%,
    transparent 70%
  );
  pointer-events: none;
  z-index: -1;
  animation: pulse-glow 4s ease-in-out infinite;
}

@keyframes pulse-glow {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.6; }
}

/* 浮动几何形状 */
.floating-shapes {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: -1;
}

.shape {
  position: absolute;
  opacity: 0.1;
  animation: float 6s ease-in-out infinite;
}

.shape:nth-child(1) {
  top: 20%;
  left: 10%;
  width: 100px;
  height: 100px;
  background: var(--color-accent-primary);
  clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
  animation-delay: 0s;
}

.shape:nth-child(2) {
  top: 60%;
  right: 15%;
  width: 80px;
  height: 80px;
  background: var(--color-accent-secondary);
  border-radius: 50%;
  animation-delay: 2s;
}

.shape:nth-child(3) {
  bottom: 20%;
  left: 20%;
  width: 120px;
  height: 120px;
  background: var(--color-accent-tertiary);
  clip-path: polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%);
  animation-delay: 4s;
}

@keyframes float {
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  33% { transform: translateY(-20px) rotate(120deg); }
  66% { transform: translateY(20px) rotate(240deg); }
}
```

#### 9.2 组件样式规范
```typescript
// 按钮组件样式
const buttonBase = 'btn inline-flex items-center justify-center font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

const buttonVariants = {
  primary: 'btn-primary bg-gradient-to-r from-cyan-400 to-purple-500 text-gray-900 hover:from-cyan-300 hover:to-purple-400 shadow-lg hover:shadow-xl',
  secondary: 'btn-secondary bg-transparent text-cyan-400 border-2 border-cyan-400 hover:bg-cyan-400 hover:text-gray-900',
  danger: 'btn-danger bg-gradient-to-r from-pink-500 to-red-500 text-white hover:from-pink-400 hover:to-red-400 shadow-lg hover:shadow-xl',
  ghost: 'bg-transparent text-gray-300 hover:bg-gray-800'
};

// 输入框样式
const inputBase = 'input w-full px-4 py-3 bg-gray-800 border-2 border-gray-700 rounded-lg text-white font-sans transition-all duration-300 focus:outline-none';
const inputFocus = 'focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400 focus:ring-opacity-50';
const inputError = 'border-pink-500 ring-2 ring-pink-500 ring-opacity-50';

// 卡片样式
const cardBase = 'card bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-700 transition-all duration-300';
const cardHover = 'hover:border-cyan-400 hover:shadow-xl hover:-translate-y-1';
```

#### 9.3 响应式设计实现
```typescript
// 断点配置
const breakpoints = {
  mobile: '640px',
  tablet: '1024px',
  desktop: '1200px'
};

// 响应式工具类
const responsive = {
  hideMobile: '@media (max-width: 640px) { display: none !important; }',
  hideTablet: '@media (min-width: 641px) and (max-width: 1024px) { display: none !important; }',
  hideDesktop: '@media (min-width: 1025px) { display: none !important; }'
};
```

#### 9.4 动画和互效果
```typescript
// 页面加载动画序列
const pageLoadAnimations = `
  .fade-in { animation: fadeIn 0.3s ease-out; }
  .slide-in-left { animation: slideInLeft 0.3s ease-out; }
  .slide-in-right { animation: slideInRight 0.3s ease-out; }
  .scale-in { animation: scaleIn 0.3s ease-out; }
`;

// 微交互动画
const microInteractions = `
  .hover-lift { transition: transform 0.2s ease-out; }
  .hover-lift:hover { transform: translateY(-2px); }

  .hover-glow { transition: box-shadow 0.2s ease-out; }
  .hover-glow:hover { box-shadow: 0 0 20px rgba(0, 212, 255, 0.5); }
`;
```

### 阶段 10: 测试与优化

#### 10.1 单元测试
```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom
```

#### 10.2 组件测试
```typescript
// components/__tests__/Button.test.tsx
import { render, screen } from '@testing-library/react';
import Button from '../common/Button';

describe('Button', () => {
  it('renders correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });
});
```

#### 10.3 性能优化
- 代码分割
- 懒加载
- 图片优化
- Bundle 分析

## 实施优先级

1. **高优先级**（必须完成）
   - 项目初始化
   - TypeScript 类型定义
   - API 服务层
   - 核心 Hooks
   - 主要组件（InputStep, PlanningStep）

2. **中优先级**（重要功能）
   - 公共组件（Button, Modal, Loading）
   - 状态管理优化
   - 错误处理

3. **低优先级**（优化和增强）
   - 单元测试
   - 性能优化
   - 设计系统完善

## 时间估算

- 项目初始化：0.5 天
- 类型定义：0.5 天
- API 服务层：1 天
- 自定义 Hooks：1 天
- 组件开发：3-4 天
- UI 优化：1-2 天
- 测试：1 天

**总计：约 8-10 天**

## 依赖主计划的关键点

1. **API 接口**：严格按照主计划定义的接口实现
2. **数据格式**：确保请求/响应格式与后端一致
3. **状态管理**：保持现有的 Context + useReducer 方案
4. **组件结构**：遵循主计划的项目结构

## 后续步骤

1. 使用 frontend-design 插件进行 UI 设计优化
2. 创建组件设计文档
3. 实现响应式布局
4. 添加交互反馈
5. 性能优化和测试