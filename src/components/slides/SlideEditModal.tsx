import React, { useState, useEffect } from 'react';
import { Modal, Button } from '../common';
import { useAppContext } from '../../context';
import { useImageGeneration } from '../../hooks';
import { getAspectRatioClass } from '../../constants';
import type { SlideImage, ImageSize } from '../../types';
import { QUALITY_OPTIONS } from '../../constants';

// ==================== Types ====================

export interface SlideEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  slideId: number | null;
}

// ==================== Main Component ====================

export const SlideEditModal: React.FC<SlideEditModalProps> = ({
  isOpen,
  onClose,
  slideId
}) => {
  const { state, dispatch } = useAppContext();
  const { generateSingleSlide } = useImageGeneration();

  // 获取当前编辑的幻灯片
  const slide = slideId ? state.slides.find(s => s.id === slideId) : null;

  // 本地状态
  const [prompt, setPrompt] = useState('');
  const [imageSize, setImageSize] = useState<ImageSize>(state.inputConfig.imageSize);
  const [isGenerating, setIsGenerating] = useState(false);

  // 同步幻灯片数据
  useEffect(() => {
    if (slide) {
      setPrompt(slide.prompt);
      setImageSize(state.inputConfig.imageSize);
    }
  }, [slide, state.inputConfig.imageSize]);

  // 处理关闭
  const handleClose = () => {
    if (isGenerating) return; // 生成中不允许关闭
    onClose();
  };

  // 处理提示词变化
  const handlePromptChange = (newPrompt: string) => {
    setPrompt(newPrompt);

    // 实时更新到状态
    if (slideId) {
      dispatch({
        type: 'UPDATE_SLIDE',
        payload: {
          id: slideId,
          updates: { prompt: newPrompt }
        }
      });
    }
  };

  // 处理重绘
  const handleRegenerate = async () => {
    if (!slideId || !prompt.trim()) return;

    setIsGenerating(true);

    try {
      // 调用生成函数
      await generateSingleSlide(slideId, prompt, {
        isManual: true,
        specificSize: imageSize
      });

      // 关闭模态框
      onClose();
    } catch (error) {
      console.error('Regenerate error:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  // 如果没有幻灯片，不渲染
  if (!slide) {
    return null;
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs">
            #{slide.id}
          </span>
          编辑幻灯片
        </div>
      }
      size="lg"
      footer={
        <div className="flex justify-end gap-3">
          <Button
            variant="secondary"
            onClick={handleClose}
            disabled={isGenerating}
          >
            取消
          </Button>
          <Button
            variant="primary"
            onClick={handleRegenerate}
            icon="fa-solid fa-wand-magic-sparkles"
            disabled={!prompt.trim() || isGenerating}
            loading={isGenerating}
          >
            立即重绘
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* 图片预览 */}
        <div className="mx-auto max-w-md">
          <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">
            图片预览
          </label>
          <div
            className={`${getAspectRatioClass(
              state.inputConfig.aspectRatio
            )} bg-gray-950 rounded-lg overflow-hidden border border-gray-800 flex items-center justify-center relative shadow-inner`}
          >
            {slide.base64 ? (
              <img
                src={slide.base64}
                alt={`Slide ${slide.id}`}
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="text-gray-600 flex flex-col items-center gap-2 p-8">
                <i className="fa-solid fa-image text-4xl opacity-30"></i>
                <span className="text-xs">暂无图片预览</span>
              </div>
            )}
          </div>
        </div>

        {/* 提示词编辑 */}
        <div>
          <label className="flex items-center justify-between text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">
            <span>提示词 (Prompt)</span>
            <span className="text-[10px] bg-gray-800 px-2 py-0.5 rounded text-gray-400">
              English Only
            </span>
          </label>
          <textarea
            className="w-full h-32 bg-gray-950 border border-gray-800 rounded-xl p-4 text-sm text-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none resize-none transition-all font-mono leading-relaxed"
            value={prompt}
            onChange={(e) => handlePromptChange(e.target.value)}
            placeholder="输入图像生成提示词..."
            disabled={isGenerating}
          />
          <p className="text-xs text-gray-500 mt-2">
            提示词将指导AI生成图片的内容和风格。建议使用英文描述。
          </p>
        </div>

        {/* 重绘画质选择 */}
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">
            重绘画质
          </label>
          <div className="flex gap-2 flex-wrap">
            {QUALITY_OPTIONS.map((q) => (
              <Button
                key={q.id}
                variant={imageSize === q.id ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setImageSize(q.id)}
                disabled={isGenerating}
                className="flex-1 min-w-[100px]"
              >
                {q.name}
              </Button>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            更高的画质需要更长的生成时间和更多的API调用。
          </p>
        </div>

        {/* 状态信息 */}
        <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <i className="fa-solid fa-info-circle text-indigo-400"></i>
            <div className="text-sm text-gray-400">
              <p className="mb-1 font-medium">提示：</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>修改提示词可以改变生成图片的内容和风格</li>
                <li>选择不同的画质会影响生成速度和图片质量</li>
                <li>点击"立即重绘"后，当前图片将被新图片替换</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

// ==================== 快捷组件 ====================

export interface SlidePreviewProps {
  slide: SlideImage;
  aspectRatio: AspectRatio;
  className?: string;
}

export const SlidePreview: React.FC<SlidePreviewProps> = ({
  slide,
  aspectRatio,
  className = ''
}) => {
  return (
    <div
      className={`${getAspectRatioClass(
        aspectRatio
      )} bg-gray-950 rounded-lg overflow-hidden border border-gray-800 flex items-center justify-center ${className}`}
    >
      {slide.base64 ? (
        <img
          src={slide.base64}
          alt={`Slide ${slide.id}`}
          className="w-full h-full object-contain"
        />
      ) : (
        <div className="text-gray-600 flex flex-col items-center gap-2 p-8">
          <i className="fa-solid fa-image text-4xl opacity-30"></i>
          <span className="text-xs">暂无图片</span>
        </div>
      )}
    </div>
  );
};
