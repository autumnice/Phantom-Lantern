import React from 'react';
import { Button, LoadingOverlay } from '../common';
import { SlideGrid } from '../slides';
import { useAppContext, useGenerationProgress, useHasErrors } from '../../context';
import type { SlideImage, AspectRatio, ImageSize } from '../../types';

// ==================== Types ====================

export interface PreviewStepProps {
  slides: SlideImage[];
  aspectRatio: AspectRatio;
  imageSize: ImageSize;
  onEditSlide: (id: number) => void;
  onRegenerateSlide: (id: number, prompt: string, size?: ImageSize) => void;
  onDownloadSlide: (id: number) => void;
  onExport: (type: 'pdf' | 'ppt') => void;
  onReturnHome: () => void;
  onBackToPlanning: () => void;
  className?: string;
}

// ==================== Sub Components ====================

const ExportButtons: React.FC<{
  onExport: (type: 'pdf' | 'ppt') => void;
  disabled?: boolean;
}> = ({ onExport, disabled }) => {
  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onExport('pdf')}
        icon="fa-solid fa-file-pdf"
        className="text-red-400 border-red-400/50 hover:bg-red-600/20"
        disabled={disabled}
      >
        PDF
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onExport('ppt')}
        icon="fa-solid fa-file-powerpoint"
        className="text-orange-400 border-orange-400/50 hover:bg-orange-600/20"
        disabled={disabled}
      >
        PPTX
      </Button>
    </div>
  );
};

const GenerationProgress: React.FC<{
  progress: number;
  total: number;
  completed: number;
  hasErrors: boolean;
}> = ({ progress, total, completed, hasErrors }) => {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              hasErrors ? 'bg-red-500' : 'bg-indigo-500'
            }`}
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <span className="text-sm text-gray-500">
          {completed}/{total}
        </span>
      </div>

      {hasErrors && (
        <span className="px-2 py-1 bg-red-500/10 text-red-400 text-xs rounded border border-red-500/20">
          有错误
        </span>
      )}

      {progress === 100 && !hasErrors && (
        <span className="px-2 py-1 bg-green-500/10 text-green-400 text-xs rounded border border-green-500/20">
          完成
        </span>
      )}
    </div>
  );
};

// ==================== Main Component ====================

export const PreviewStep: React.FC<PreviewStepProps> = ({
  slides,
  aspectRatio,
  imageSize,
  onEditSlide,
  onRegenerateSlide,
  onDownloadSlide,
  onExport,
  onReturnHome,
  onBackToPlanning,
  className = ''
}) => {
  const { state } = useAppContext();
  const progress = useGenerationProgress(state);
  const hasErrors = useHasErrors(state);
  const completedCount = slides.filter(s => s.status === 'done').length;

  // 检查是否可以导出（至少有一张完成的图片）
  const canExport = completedCount > 0;

  // 是否正在生成
  const isGenerating = slides.some(s => s.status === 'generating' || s.status === 'retrying');

  return (
    <div className={`max-w-7xl mx-auto ${className}`}>
      {/* 头部信息 */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 bg-gray-900/50 p-6 rounded-2xl border border-gray-800">
        <div>
          <h2 className="text-2xl font-bold">生成预览</h2>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-sm text-gray-500">
              图片生成任务已安排。并发较多时可能需要稍等片刻。
            </p>
            <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 text-[10px] rounded border border-indigo-500/20 font-bold">
              {imageSize} 品质
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {/* 生成进度 */}
          {slides.length > 0 && (
            <GenerationProgress
              progress={progress}
              total={slides.length}
              completed={completedCount}
              hasErrors={hasErrors}
            />
          )}

          {/* 导航按钮 */}
          <div className="flex bg-gray-800 p-1 rounded-xl border border-gray-700">
            <Button
              variant="ghost"
              size="xs"
              onClick={onReturnHome}
              icon="fa-solid fa-house"
              className="px-4 py-2"
            >
              首页
            </Button>
            <Button
              variant="ghost"
              size="xs"
              onClick={onBackToPlanning}
              icon="fa-solid fa-arrow-left"
              className="px-4 py-2 border-l border-gray-700"
            >
              修改大纲
            </Button>
          </div>

          {/* 导出按钮 */}
          <ExportButtons onExport={onExport} disabled={!canExport} />
        </div>
      </div>

      {/* 幻灯片网格 */}
      {slides.length > 0 ? (
        <SlideGrid
          slides={slides}
          aspectRatio={aspectRatio}
          onEditSlide={onEditSlide}
          onRegenerateSlide={onRegenerateSlide}
          onDownloadSlide={onDownloadSlide}
          className="mb-12"
        />
      ) : (
        <EmptyPreviewState onBackToPlanning={onBackToPlanning} />
      )}

      {/* 底部操作 */}
      <div className="flex justify-center mt-12 mb-8">
        <Button
          variant="secondary"
          size="lg"
          onClick={onReturnHome}
          icon="fa-solid fa-arrow-left"
          className="group"
        >
          <span className="group-hover:-translate-x-1 transition-transform">
            返回首页
          </span>
        </Button>
      </div>

      {/* 加载遮罩 */}
      {isGenerating && (
        <LoadingOverlay
          message="正在生成图片，请稍候..."
          title="AI 绘图中"
          variant="minimal"
        />
      )}
    </div>
  );
};

// ==================== 快捷组件 ====================

export interface EmptyPreviewStateProps {
  onBackToPlanning: () => void;
}

export const EmptyPreviewState: React.FC<EmptyPreviewStateProps> = ({
  onBackToPlanning
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-gray-500">
      <i className="fa-solid fa-images text-6xl mb-6 opacity-50"></i>
      <h3 className="text-xl font-bold mb-2">暂无预览</h3>
      <p className="text-sm mb-6">请先生成幻灯片图片</p>
      <Button
        variant="secondary"
        onClick={onBackToPlanning}
        icon="fa-solid fa-arrow-left"
      >
        返回大纲
      </Button>
    </div>
  );
};

export interface LoadingPreviewStateProps {
  message?: string;
}

export const LoadingPreviewState: React.FC<LoadingPreviewStateProps> = ({
  message = '正在生成预览...'
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-gray-500">
      <i className="fa-solid fa-circle-notch fa-spin text-4xl mb-4 text-indigo-500"></i>
      <p className="text-sm">{message}</p>
    </div>
  );
};
