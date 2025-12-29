import React from 'react';
import { Button } from '../common';
import type { SlidePlan, ImageSize } from '../../types';

// ==================== Types ====================

export interface PlanningStepProps {
  plan: SlidePlan[];
  imageSize: ImageSize;
  onPlanChange: (plan: SlidePlan[]) => void;
  onBack: () => void;
  onGenerate: () => void;
  className?: string;
}

// ==================== Sub Components ====================

interface SlidePlanItemProps {
  index: number;
  plan: SlidePlan;
  onChange: (updates: Partial<SlidePlan>) => void;
}

const SlidePlanItem: React.FC<SlidePlanItemProps> = ({
  index,
  plan,
  onChange
}) => {
  return (
    <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 flex gap-4 hover:border-gray-600 transition-colors">
      {/* 幻灯片编号 */}
      <div className="w-8 h-8 rounded-full bg-gray-700 flex-shrink-0 flex items-center justify-center font-bold text-sm">
        {index + 1}
      </div>

      {/* 内容编辑区 */}
      <div className="flex-1 space-y-3">
        {/* 标题输入 */}
        <input
          className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm font-semibold text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
          value={plan.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="输入幻灯片标题..."
        />

        {/* 内容输入 */}
        <textarea
          className="w-full h-24 bg-gray-900 border border-gray-700 rounded px-3 py-2 text-xs leading-relaxed text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none transition"
          value={plan.content}
          onChange={(e) => onChange({ content: e.target.value })}
          placeholder="输入幻灯片内容要点..."
        />

        {/* 视觉描述（只读） */}
        <div className="bg-gray-900/50 border border-gray-700 rounded p-2">
          <label className="block text-xs font-medium text-gray-500 mb-1">
            视觉描述（用于AI绘图）
          </label>
          <p className="text-xs text-gray-400 italic">
            {plan.visualDescription || '暂无描述'}
          </p>
        </div>
      </div>
    </div>
  );
};

// ==================== Main Component ====================

export const PlanningStep: React.FC<PlanningStepProps> = ({
  plan,
  imageSize,
  onPlanChange,
  onBack,
  onGenerate,
  className = ''
}) => {
  // 处理单个幻灯片更新
  const handleSlideChange = (index: number, updates: Partial<SlidePlan>) => {
    const newPlan = [...plan];
    newPlan[index] = { ...newPlan[index], ...updates };
    onPlanChange(newPlan);
  };

  // 统计信息
  const totalSlides = plan.length;
  const totalCharacters = plan.reduce((sum, p) => sum + p.content.length, 0);

  return (
    <div className={`max-w-5xl mx-auto flex flex-col h-[calc(100vh-250px)] ${className}`}>
      {/* 头部 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">大纲规划</h2>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-sm text-gray-500">
              共 {totalSlides} 张幻灯片，{totalCharacters} 字符
            </p>
            <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 text-[10px] rounded border border-indigo-500/20 font-bold">
              {imageSize} 品质
            </span>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            icon="fa-solid fa-arrow-left"
          >
            返回修改
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={onGenerate}
            icon="fa-solid fa-wand-magic-sparkles"
          >
            开始绘图 ({imageSize})
          </Button>
        </div>
      </div>

      {/* 幻灯片列表 */}
      <div className="flex-1 overflow-y-auto pr-2 space-y-4">
        {plan.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <i className="fa-solid fa-file-circle-question text-4xl mb-4 opacity-50"></i>
            <p>暂无大纲数据</p>
          </div>
        ) : (
          plan.map((slidePlan, index) => (
            <SlidePlanItem
              key={slidePlan.id}
              index={index}
              plan={slidePlan}
              onChange={(updates) => handleSlideChange(index, updates)}
            />
          ))
        )}
      </div>

      {/* 底部提示 */}
      <div className="mt-6 p-4 bg-gray-900/50 border border-gray-700 rounded-lg">
        <div className="flex items-start gap-3">
          <i className="fa-solid fa-lightbulb text-yellow-500 mt-1"></i>
          <div className="text-sm text-gray-400">
            <p className="mb-1">提示：</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>您可以在此编辑每张幻灯片的标题和内容</li>
              <li>视觉描述由AI自动生成，用于指导图片绘制</li>
              <li>确认无误点击"开始绘图"生成图片</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==================== 快捷组件 ====================

export interface EmptyPlanningStateProps {
  onBack: () => void;
}

export const EmptyPlanningState: React.FC<EmptyPlanningStateProps> = ({ onBack }) => {
  return (
    <div className="max-w-5xl mx-auto flex flex-col items-center justify-center h-[calc(100vh-250px)] text-gray-500">
      <i className="fa-solid fa-file-circle-question text-6xl mb-6 opacity-50"></i>
      <h3 className="text-xl font-bold mb-2">暂无大纲数据</h3>
      <p className="text-sm mb-6">请先配置您的演示文稿内容</p>
      <Button variant="secondary" onClick={onBack} icon="fa-solid fa-arrow-left">
        返回配置
      </Button>
    </div>
  );
};
