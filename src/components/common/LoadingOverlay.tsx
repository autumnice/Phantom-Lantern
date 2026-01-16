import React from 'react';

// ==================== Types ====================

export interface LoadingOverlayProps {
  isOpen?: boolean;
  message?: string;
  title?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'minimal';
}

// ==================== Component ====================

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isOpen = true,
  message = '正在处理...',
  title = 'AI 深度规划中',
  size = 'md',
  variant = 'default'
}) => {
  if (!isOpen) return null;

  // 尺寸配置
  const sizeConfig = {
    sm: {
      container: 'w-16 h-16',
      inner: 'inset-3',
      icon: 'text-xl',
      title: 'text-xl',
      message: 'text-sm'
    },
    md: {
      container: 'w-24 h-24',
      inner: 'inset-4',
      icon: 'text-2xl',
      title: 'text-2xl',
      message: 'text-base'
    },
    lg: {
      container: 'w-32 h-32',
      inner: 'inset-5',
      icon: 'text-3xl',
      title: 'text-3xl',
      message: 'text-lg'
    }
  }[size];

  if (variant === 'minimal') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
        <div className="flex flex-col items-center gap-4 bg-gray-950/80 backdrop-blur-sm p-6 rounded-2xl shadow-2xl border border-gray-800/50">
          <div className="relative">
            <div className="w-12 h-12 border-4 border-indigo-500/20 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
          {message && (
            <p className="text-gray-200 text-sm font-medium">{message}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-gray-950/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
      {/* 主加载动画 */}
      <div className={`relative ${sizeConfig.container} mb-8`}>
        {/* 外圈 */}
        <div className="absolute inset-0 border-4 border-indigo-500/20 rounded-full"></div>

        {/* 旋转圈 */}
        <div className="absolute inset-0 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>

        {/* 内圈和内容 */}
        <div className={`absolute ${sizeConfig.inner} bg-indigo-500/10 rounded-full flex items-center justify-center`}>
          <i className={`fa-solid fa-brain ${sizeConfig.icon} text-indigo-400 animate-pulse`}></i>
        </div>
      </div>

      {/* 标题 */}
      <h3 className={`${sizeConfig.title} font-bold text-white mb-2`}>
        {title}
      </h3>

      {/* 消息文本 */}
      <p className={`${sizeConfig.message} text-gray-400 max-w-md leading-relaxed`}>
        {message}
      </p>

      {/* 跳动点 */}
      <div className="mt-8 flex gap-2">
        <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
        <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
        <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce"></div>
      </div>
    </div>
  );
};

// ==================== 快捷组件 ====================

export const FullScreenLoading: React.FC<Pick<LoadingOverlayProps, 'message' | 'title'>> = ({
  message,
  title
}) => (
  <LoadingOverlay
    isOpen={true}
    message={message}
    title={title}
    size="md"
    variant="default"
  />
);

export const InlineLoading: React.FC<Pick<LoadingOverlayProps, 'message'>> = ({ message }) => (
  <div className="flex items-center gap-2 text-gray-400">
    <div className="w-4 h-4 border-2 border-indigo-500/20 rounded-full">
      <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin -m-0.5"></div>
    </div>
    <span className="text-sm">{message || '加载中...'}</span>
  </div>
);
