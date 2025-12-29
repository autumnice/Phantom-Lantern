import React from 'react';

// ==================== Types ====================

export type ButtonVariant =
  | 'primary'    // 主按钮 - 渐变背景
  | 'secondary'  // 次按钮 - 灰色背景
  | 'danger'     // 危险按钮 - 红色
  | 'warning'    // 警告按钮 - 黄色
  | 'success'    // 成功按钮 - 绿色
  | 'outline'    // 轮廓按钮
  | 'ghost';     // 幽灵按钮

export type ButtonSize =
  | 'xs'   // 超小
  | 'sm'   // 小
  | 'md'   // 中（默认）
  | 'lg';  // 大

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  icon?: string;  // Font Awesome icon class
  iconPosition?: 'left' | 'right';
  children: React.ReactNode;
}

// ==================== Component ====================

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  icon,
  iconPosition = 'left',
  children,
  className = '',
  disabled,
  ...props
}) => {
  // 基础样式
  const baseClasses =
    'inline-flex items-center justify-center gap-2 font-bold rounded-lg transition-all ' +
    'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ' +
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none';

  // 尺寸样式
  const sizeClasses = {
    xs: 'px-3 py-1.5 text-xs',
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3.5 text-base'
  }[size];

  // 变体样式
  const variantClasses = {
    primary:
      'bg-gradient-to-r from-indigo-600 to-purple-600 text-white ' +
      'hover:from-indigo-500 hover:to-purple-500 ' +
      'shadow-lg hover:shadow-indigo-500/25 ' +
      'transform hover:scale-[1.01] active:scale-[0.99]',
    secondary:
      'bg-gray-700 text-white hover:bg-gray-600 ' +
      'border border-gray-600',
    danger:
      'bg-red-600 text-white hover:bg-red-500 ' +
      'shadow-lg hover:shadow-red-500/25',
    warning:
      'bg-yellow-600 text-white hover:bg-yellow-500 ' +
      'shadow-lg hover:shadow-yellow-500/25',
    success:
      'bg-green-600 text-white hover:bg-green-500 ' +
      'shadow-lg hover:shadow-green-500/25',
    outline:
      'bg-transparent border-2 border-indigo-600 text-indigo-600 ' +
      'hover:bg-indigo-600 hover:text-white',
    ghost:
      'bg-transparent text-gray-400 hover:text-white hover:bg-gray-700 ' +
      'border border-gray-700 hover:border-gray-500'
  }[variant];

  // 加载状态样式
  const loadingClasses = loading ? 'cursor-wait' : '';

  // 全宽样式
  const widthClasses = fullWidth ? 'w-full' : '';

  // 合并所有样式
  const allClasses = [
    baseClasses,
    sizeClasses,
    variantClasses,
    loadingClasses,
    widthClasses,
    className
  ].join(' ');

  // 渲染图标
  const renderIcon = () => {
    if (!icon) return null;

    const iconClasses = loading ? 'fa-solid fa-circle-notch animate-spin' : icon;

    return <i className={iconClasses} />;
  };

  return (
    <button
      className={allClasses}
      disabled={disabled || loading}
      {...props}
    >
      {iconPosition === 'left' && renderIcon()}
      {children}
      {iconPosition === 'right' && renderIcon()}
    </button>
  );
};

// ==================== 快捷组件 ====================

export const PrimaryButton: React.FC<Omit<ButtonProps, 'variant'>> = (props) => (
  <Button variant="primary" {...props} />
);

export const SecondaryButton: React.FC<Omit<ButtonProps, 'variant'>> = (props) => (
  <Button variant="secondary" {...props} />
);

export const DangerButton: React.FC<Omit<ButtonProps, 'variant'>> = (props) => (
  <Button variant="danger" {...props} />
);

export const OutlineButton: React.FC<Omit<ButtonProps, 'variant'>> = (props) => (
  <Button variant="outline" {...props} />
);

export const GhostButton: React.FC<Omit<ButtonProps, 'variant'>> = (props) => (
  <Button variant="ghost" {...props} />
);
