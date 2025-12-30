import React, { useEffect } from 'react';
import { AppProvider, useAppContext, useCurrentStyle } from './context';
import { Header, SimpleHeader } from './components/layout';
import { InputStep, PlanningStep, PreviewStep } from './components/steps';
import { SlideEditModal } from './components/slides';
import { LoadingOverlay, ConfirmModal } from './components/common';
import { useImageGeneration, useSlidePlan, useExport } from './hooks';
import { STYLES, DETAIL_LEVELS } from './constants';
import type { AppStep, SlideImage } from './types';

// ==================== Main App Component ====================

const AppContent: React.FC = () => {
  const { state, dispatch } = useAppContext();
  const currentStyle = useCurrentStyle(state);
  const { generatePlan } = useSlidePlan();
  const { generateAllSlides } = useImageGeneration();
  const { exportToPPTX, exportToPDF } = useExport();

  // 初始化 API Key 检查
  useEffect(() => {
    const checkApiKey = async () => {
      if (typeof window !== 'undefined' && (window as any).aistudio?.hasSelectedApiKey) {
        const hasKey = await (window as any).aistudio.hasSelectedApiKey();
        dispatch({ type: 'SET_HAS_KEY', payload: hasKey });
      } else {
        dispatch({ type: 'SET_HAS_KEY', payload: true });
      }
    };

    checkApiKey();
  }, [dispatch]);

  // 处理配置提交（生成大纲）
  const handleConfigSubmit = async () => {
    if (!state.inputConfig.text.trim()) {
      alert('请先输入内容或链接');
      return;
    }

    dispatch({
      type: 'SET_LOADING',
      payload: {
        isLoading: true,
        message: '正在分析您的内容，请稍候...'
      }
    });

    try {
      await generatePlan(state.inputConfig);
      dispatch({ type: 'SET_STEP', payload: 'planning' });
    } catch (error: any) {
      console.error('Plan generation error:', error);
      if (error.code === 'BILLING_NOT_ENABLED') {
        dispatch({ type: 'SET_HAS_KEY', payload: false });
        alert('所选 API 密钥的项目未启用计费，请重新选择以使用 Pro 模型。');
      } else {
        alert('大纲规划失败。请检查内容或重试。');
      }
    } finally {
      dispatch({
        type: 'SET_LOADING',
        payload: { isLoading: false }
      });
    }
  };

  // 处理开始生成
  const handleStartGeneration = async () => {
    // 创建生成版本
    const version = Date.now();

    // 生成幻灯片配置
    const styleObj = state.inputConfig.selectedStyleId === 'custom'
      ? { name: '自定义', prompt: state.inputConfig.customStylePrompt }
      : STYLES.find(s => s.id === state.inputConfig.selectedStyleId) || STYLES[0];

    const initialSlides: SlideImage[] = state.plan.map((p, index) => ({
      id: p.id || index + 1,
      base64: null,
      status: 'pending',
      prompt: `High quality professional ${state.inputConfig.aspectRatio} presentation slide design.
               Title: "${p.title}" (rendered in elegant Chinese).
               Body: "${p.content}" (rendered in legible Chinese).
               Style Theme: ${styleObj.prompt}.
               Imagery: ${p.visualDescription}.
               Ensure cinematic lighting, high resolution details, and a clean professional layout.`,
      retryCount: 0
    }));

    // 更新状态
    dispatch({ type: 'SET_SLIDES', payload: initialSlides });
    dispatch({ type: 'SET_STEP', payload: 'preview' });

    // 开始生成
    await generateAllSlides(initialSlides, version);
  };

  // 处理导出
  const handleExport = async (type: 'pdf' | 'ppt') => {
    try {
      if (type === 'ppt') {
        await exportToPPTX({
          slides: state.slides,
          aspectRatio: state.inputConfig.aspectRatio
        });
      } else {
        await exportToPDF({
          slides: state.slides,
          aspectRatio: state.inputConfig.aspectRatio
        });
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('导出失败，请重试。');
    }
  };

  // 处理返回首页
  const handleReturnHome = () => {
    dispatch({ type: 'SET_SHOW_RESET_CONFIRM', payload: true });
  };

  // 确认重置
  const confirmReset = () => {
    dispatch({ type: 'RESET_ALL' });
    dispatch({ type: 'SET_SHOW_RESET_CONFIRM', payload: false });
  };

  // 处理手动重绘
  const handleManualRegenerate = async (id: number, prompt: string, size?: typeof state.inputConfig.imageSize) => {
    const { generateSingleSlide } = useImageGeneration();
    await generateSingleSlide(id, prompt, {
      isManual: true,
      specificSize: size
    });
  };

  // 处理下载单张图片
  const handleDownloadSlide = (id: number) => {
    const slide = state.slides.find(s => s.id === id);
    if (slide?.base64) {
      const link = document.createElement('a');
      link.href = slide.base64;
      link.download = `slide-${id}.png`;
      link.click();
    }
  };

  // 渲染内容
  const renderContent = () => {
    switch (state.step) {
      case 'input':
        return (
          <InputStep
            config={state.inputConfig}
            onConfigChange={(config) => dispatch({ type: 'UPDATE_INPUT_CONFIG', payload: config })}
            onSubmit={handleConfigSubmit}
          />
        );

      case 'planning':
        return (
          <PlanningStep
            plan={state.plan}
            imageSize={state.inputConfig.imageSize}
            onPlanChange={(plan) => dispatch({ type: 'SET_PLAN', payload: plan })}
            onBack={() => dispatch({ type: 'SET_STEP', payload: 'input' })}
            onGenerate={handleStartGeneration}
          />
        );

      case 'preview':
        return (
          <PreviewStep
            slides={state.slides}
            aspectRatio={state.inputConfig.aspectRatio}
            imageSize={state.inputConfig.imageSize}
            onEditSlide={(id) => dispatch({ type: 'SET_EDITING_SLIDE_ID', payload: id })}
            onRegenerateSlide={handleManualRegenerate}
            onDownloadSlide={handleDownloadSlide}
            onExport={handleExport}
            onReturnHome={handleReturnHome}
            onBackToPlanning={() => dispatch({ type: 'SET_STEP', payload: 'planning' })}
          />
        );

      default:
        return null;
    }
  };

  // API Key 检查
  if (state.hasKey === false) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-indigo-500/10 rounded-3xl flex items-center justify-center mb-6">
          <i className="fa-solid fa-key text-3xl text-indigo-500"></i>
        </div>
        <h2 className="text-2xl font-bold mb-4">需要连接付费 API 密钥</h2>
        <p className="text-gray-400 mb-8 max-w-sm">
          4K 图像生成和 Pro 模型需要使用开启了计费功能的 GCP 项目 API 密钥。
        </p>
        <Button
          variant="primary"
          size="lg"
          onClick={async () => {
            if ((window as any).aistudio?.openSelectKey) {
              await (window as any).aistudio.openSelectKey();
              dispatch({ type: 'SET_HAS_KEY', payload: true });
            }
          }}
        >
          连接密钥
        </Button>
        <a
          href="https://ai.google.dev/gemini-api/docs/billing"
          target="_blank"
          className="mt-4 text-xs text-indigo-400 hover:underline"
        >
          了解计费文档
        </a>
      </div>
    );
  }

  if (state.hasKey === null) {
    return <LoadingOverlay message="正在检查 API 密钥..." />;
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-sans">
      {/* 头部 */}
      {state.step === 'input' ? (
        <Header />
      ) : (
        <SimpleHeader
          title="NanoDeck AI"
          onBack={state.step === 'preview' ? () => dispatch({ type: 'SET_STEP', payload: 'planning' }) : undefined}
          onHome={handleReturnHome}
        />
      )}

      {/* 步骤指示器 */}
      {state.step !== 'preview' && (
        <div className="container mx-auto px-4 pt-8">
          <div className="flex justify-center">
            <div className="flex items-center gap-4 text-xs sm:text-sm font-medium">
              <span className={`px-3 py-1 rounded-full ${
                state.step === 'input' ? 'bg-indigo-600 text-white' : 'bg-green-600 text-white'
              }`}>
                1. 设置
              </span>
              <div className="w-6 sm:w-8 h-px bg-gray-800"></div>
              <span className={`px-3 py-1 rounded-full ${
                state.step === 'planning' ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-500'
              }`}>
                2. 大纲
              </span>
              <div className="w-6 sm:w-8 h-px bg-gray-800"></div>
              <span className={`px-3 py-1 rounded-full ${
                state.step === 'preview' ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-500'
              }`}>
                3. 生成
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 主内容 */}
      <main className="container mx-auto px-4 py-8">
        {renderContent()}
      </main>

      {/* 编辑模态框 */}
      <SlideEditModal
        isOpen={state.editingSlideId !== null}
        onClose={() => dispatch({ type: 'SET_EDITING_SLIDE_ID', payload: null })}
        slideId={state.editingSlideId}
      />

      {/* 重置确认模态框 */}
      <ConfirmModal
        isOpen={state.showResetConfirm}
        onConfirm={confirmReset}
        onCancel={() => dispatch({ type: 'SET_SHOW_RESET_CONFIRM', payload: false })}
        title="返回首页？"
        message={
          <div className="text-sm text-gray-400 leading-relaxed">
            确定要返回首页吗？
            <br />
            <span className="text-red-400">
              当前生成的演示文稿将会丢失
            </span>
            ，且无法恢复。建议先导出文件。
          </div>
        }
        confirmText="确认返回"
        cancelText="取消"
        confirmVariant="danger"
      />

      {/* 加载遮罩 */}
      {state.isLoading && (
        <LoadingOverlay
          message={state.loadingMessage}
          title={state.step === 'input' ? 'AI 深度规划中' : 'AI 绘图中'}
        />
      )}
    </div>
  );
};

// ==================== App Wrapper ====================

const App: React.FC = () => {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
};

export default App;
