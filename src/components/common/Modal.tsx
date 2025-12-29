import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './Button';

// ==================== Types ====================

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  closeOnBackdrop?: boolean;
  closeOnEsc?: boolean;
  className?: string;
}

// ==================== Component ====================

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  closeOnBackdrop = true,
  closeOnEsc = true,
  className = ''
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  // ESC 键关闭
  useEffect(() => {
    if (!isOpen || !closeOnEsc) return;

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, closeOnEsc, onClose]);

  // 防止背景滚动
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // 尺寸样式
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl'
  }[size];

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={closeOnBackdrop ? onClose : undefined}
    >
      {/* 背景遮罩 */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      {/* 模态框容器 */}
      <div
        ref={modalRef}
        className={`relative w-full ${sizeClasses} bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl transform scale-100 ring-1 ring-white/10 ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        {title && (
          <div className="flex items-center justify-between p-6 border-b border-gray-800 bg-gray-900/50 rounded-t-2xl">
            <h3 className="text-xl font-bold text-white">{title}</h3>
            <Button
              variant="ghost"
              size="sm"
              icon="fa-solid fa-xmark"
              onClick={onClose}
              className="w-8 h-8"
            />
          </div>
        )}

        {/* 内容 */}
        <div className="p-6 overflow-y-auto max-h-[70vh]">
          {children}
        </div>

        {/* 底部 */}
        {footer && (
          <div className="flex justify-end gap-3 p-6 border-t border-gray-800 bg-gray-900/50 rounded-b-2xl">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

// ==================== 快捷组件 ====================

export interface ConfirmModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'primary' | 'danger';
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onConfirm,
  onCancel,
  title = '确认操作',
  message,
  confirmText = '确认',
  cancelText = '取消',
  confirmVariant = 'primary'
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onCancel}>
            {cancelText}
          </Button>
          <Button
            variant={confirmVariant}
            onClick={onConfirm}
          >
            {confirmText}
          </Button>
        </>
      }
    >
      <p className="text-gray-400 text-center leading-relaxed">
        {message}
      </p>
    </Modal>
  );
};
