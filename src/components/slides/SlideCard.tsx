import React from 'react';
import { getAspectRatioClass } from '../../constants';
import type { SlideImage, AspectRatio, ImageSize } from '../../types';

// ==================== Types ====================

export interface SlideCardProps {
  slide: SlideImage;
  aspectRatio: AspectRatio;
  onEdit?: (id: number) => void;
  onRegenerate?: (id: number, prompt: string) => void;
  onDownload?: (id: number) => void;
  showActions?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

// ==================== Component ====================

export const SlideCard: React.FC<SlideCardProps> = ({
  slide,
  aspectRatio,
  onEdit,
  onRegenerate,
  onDownload,
  showActions = true,
  size = 'md'
}) => {
  // 尺寸配置
  const sizeConfig = {
    sm: 'rounded-lg',
    md: 'rounded-xl',
    lg: 'rounded-2xl'
  }[size];

  // 渲染幻灯片内容
  const renderSlideContent = () => {
    const { status, base64, errorMsg } = slide;

    switch (status) {
      case 'pending':
        return (
          <div className="w-full h-full flex items-center justify-center text-gray-500 bg-gray-900/30">
            <div className="text-center">
              <i className="fa-solid fa-clock text-2xl mb-2 opacity-50"></i>
              <p className="text-xs">等待中...</p>
            </div>
          </div>
        );

      case 'generating':
      case 'retrying':
        return (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gray-900/50 p-4 text-center">
            <i className="fa-solid fa-circle-notch fa-spin text-xl text-indigo-500 mb-2"></i>
            <span className="text-[10px] uppercase tracking-widest animate-pulse">
              {status === 'retrying' ? '重试队列中...' : '绘制中...'}
            </span>
            {errorMsg && (
              <p className="text-[9px] mt-2 text-gray-400 leading-tight bg-gray-900/80 px-2 py-1 rounded border border-gray-700">
                {errorMsg}
              </p>
            )}
          </div>
        );

      case 'done':
        if (base64) {
          return (
            <div className="relative w-full h-full group">
              <img
                src={base64}
                alt={`Slide ${slide.id}`}
                className="w-full h-full object-cover animate-in fade-in duration-500"
              />

              {/* 悬停操作 */}
              {showActions && (
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 backdrop-blur-sm">
                  <button
                    onClick={() => onEdit?.(slide.id)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-xs transform scale-90 group-hover:scale-100 transition-all shadow-lg"
                  >
                    <i className="fa-solid fa-pen-to-square mr-2"></i>
                    编辑 / 重绘
                  </button>
                  <button
                    onClick={() => onDownload?.(slide.id)}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-bold text-xs transform scale-90 group-hover:scale-100 transition-all backdrop-blur-md"
                  >
                    <i className="fa-solid fa-download mr-2"></i>
                    保存图片
                  </button>
                </div>
              )}
            </div>
          );
        }
        return (
          <div className="w-full h-full flex items-center justify-center text-gray-600">
            <div className="text-center">
              <i className="fa-solid fa-image text-3xl opacity-30 mb-2"></i>
              <p className="text-xs">暂无图片</p>
            </div>
          </div>
        );

      case 'error':
        return (
          <div className="w-full h-full flex flex-col items-center justify-center text-red-400 p-4 text-center bg-gray-900/50">
            <i className="fa-solid fa-triangle-exclamation mb-2 text-2xl"></i>
            <span className="text-[11px] line-clamp-3 mb-3">
              {errorMsg || '生成失败'}
            </span>
            {onRegenerate && (
              <button
                onClick={() => onRegenerate(slide.id, slide.prompt)}
                className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-xs transition flex items-center gap-1"
              >
                <i className="fa-solid fa-rotate-right"></i>
                重试
              </button>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div
      className={`
        group relative overflow-hidden
        bg-gray-800 border border-gray-700
        ${sizeConfig}
        ${getAspectRatioClass(aspectRatio)}
        shadow-lg hover:shadow-indigo-500/10
        transition-all duration-300
      `}
    >
      {/* 幻灯片内容 */}
      {renderSlideContent()}

      {/* 幻灯片编号 */}
      <div className="absolute top-2 left-2 px-2 py-1 bg-black/50 backdrop-blur-sm rounded text-[10px] font-mono text-white/50 pointer-events-none">
        #{slide.id}
      </div>

      {/* 状态指示器 */}
      {renderStatusIndicator(slide.status)}
    </div>
  );
};

function renderStatusIndicator(status: SlideImage['status']): React.ReactNode {
  const statusStyles: Record<string, string> = {
    done: 'bg-green-500 shadow-green-500/50 animate-pulse',
    error: 'bg-red-500 shadow-red-500/50',
    generating: 'bg-indigo-500 shadow-indigo-500/50 animate-pulse',
    retrying: 'bg-indigo-500 shadow-indigo-500/50 animate-pulse',
  };

  const style = statusStyles[status];
  if (!style) return null;

  return (
    <div className={`absolute top-2 right-2 w-2 h-2 rounded-full shadow-lg ${style}`} />
  );
}

// ==================== 快捷组件 ====================

export interface SlideGridProps {
  slides: SlideImage[];
  aspectRatio: AspectRatio;
  onEditSlide?: (id: number) => void;
  onRegenerateSlide?: (id: number, prompt: string) => void;
  onDownloadSlide?: (id: number) => void;
  className?: string;
}

export const SlideGrid: React.FC<SlideGridProps> = ({
  slides,
  aspectRatio,
  onEditSlide,
  onRegenerateSlide,
  onDownloadSlide,
  className = ''
}) => {
  // 根据比例确定网格列数
  const getGridCols = () => {
    switch (aspectRatio) {
      case '16:9':
        return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
      case '4:3':
        return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4';
      case '1:1':
        return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5';
      case '3:4':
      case '9:16':
        return 'grid-cols-2 md:grid-cols-3';
      default:
        return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
    }
  };

  return (
    <div className={`grid ${getGridCols()} gap-6 ${className}`}>
      {slides.map((slide) => (
        <SlideCard
          key={slide.id}
          slide={slide}
          aspectRatio={aspectRatio}
          onEdit={onEditSlide}
          onRegenerate={onRegenerateSlide}
          onDownload={onDownloadSlide}
        />
      ))}
    </div>
  );
};
