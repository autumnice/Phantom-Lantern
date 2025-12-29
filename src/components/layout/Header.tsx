import React from 'react';

// ==================== Types ====================

export interface HeaderProps {
  title?: string;
  subtitle?: string;
  logoIcon?: string;
  logoGradient?: string;
  rightContent?: React.ReactNode;
  className?: string;
}

// ==================== Component ====================

export const Header: React.FC<HeaderProps> = ({
  title = 'NanoDeck AI',
  subtitle = 'Powered by Gemini 3 Pro',
  logoIcon = 'fa-bolt',
  logoGradient = 'from-yellow-400 to-orange-500',
  rightContent,
  className = ''
}) => {
  return (
    <header className={`flex items-center justify-between px-6 py-4 bg-gray-900 border-b border-gray-800 ${className}`}>
      {/* Logo 和标题 */}
      <div className="flex items-center gap-3">
        {/* Logo */}
        <div className={`w-8 h-8 bg-gradient-to-br ${logoGradient} rounded-lg flex items-center justify-center shadow-lg`}>
          <i className={`fa-solid ${logoIcon} text-gray-900 text-lg`}></i>
        </div>

        {/* 标题 */}
        <div className="flex flex-col">
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* 右侧内容 */}
      {rightContent && (
        <div className="flex items-center gap-4">
          {rightContent}
        </div>
      )}
    </header>
  );
};

// ==================== 快捷组件 ====================

export interface SimpleHeaderProps {
  title?: string;
  onBack?: () => void;
  onHome?: () => void;
}

export const SimpleHeader: React.FC<SimpleHeaderProps> = ({
  title = 'NanoDeck AI',
  onBack,
  onHome
}) => {
  return (
    <Header
      title={title}
      rightContent={
        <div className="flex bg-gray-800 p-1 rounded-xl border border-gray-700">
          {onHome && (
            <button
              onClick={onHome}
              className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition flex items-center gap-2"
            >
              <i className="fa-solid fa-house"></i>
              首页
            </button>
          )}
          {onBack && (
            <button
              onClick={onBack}
              className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition flex items-center gap-2 border-l border-gray-700"
            >
              <i className="fa-solid fa-arrow-left"></i>
              返回
            </button>
          )}
        </div>
      }
    />
  );
};

export interface StepHeaderProps {
  currentStep: number;
  steps: string[];
}

export const StepHeader: React.FC<StepHeaderProps> = ({
  currentStep,
  steps
}) => {
  return (
    <div className="flex justify-center mb-8">
      <div className="flex items-center gap-4 text-xs sm:text-sm font-medium">
        {steps.map((step, index) => (
          <React.Fragment key={index}>
            <span
              className={`px-3 py-1 rounded-full ${
                index === currentStep
                  ? 'bg-indigo-600 text-white'
                  : index < currentStep
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-800 text-gray-500'
              }`}
            >
              {index + 1}. {step}
            </span>
            {index < steps.length - 1 && (
              <div
                className={`w-6 sm:w-8 h-px ${
                  index < currentStep ? 'bg-green-600' : 'bg-gray-800'
                }`}
              ></div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};
