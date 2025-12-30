import React, { useState } from 'react';
import { Button } from '../common';
import type { InputConfig, AspectRatio, ImageSize } from '../../types';
import { STYLES, DETAIL_LEVELS, QUALITY_OPTIONS, RATIO_OPTIONS } from '../../constants';

// ==================== Types ====================

export interface InputStepProps {
  config: InputConfig;
  onConfigChange: (config: InputConfig) => void;
  onSubmit: () => void;
  className?: string;
}

// ==================== Sub Components ====================

const FileUploadButton: React.FC<{
  onFileSelect: (content: string) => void;
}> = ({ onFileSelect }) => {
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      onFileSelect(content);
    };
    reader.readAsText(file);

    // 清空 input，允许重复选择同一文件
    e.target.value = '';
  };

  return (
    <label className="cursor-pointer text-sm text-indigo-400 hover:text-indigo-300 flex items-center gap-1 px-3 py-1.5 rounded hover:bg-gray-700/50 transition">
      <i className="fa-solid fa-paperclip"></i>
      导入文件
      <input
        type="file"
        className="hidden"
        accept=".txt,.md"
        onChange={handleFileUpload}
      />
    </label>
  );
};

const UrlInput: React.FC<{
  onUrlAdd: (url: string) => void;
}> = ({ onUrlAdd }) => {
  const [showInput, setShowInput] = useState(false);
  const [url, setUrl] = useState('');

  const handleAddUrl = () => {
    if (!url.trim()) return;
    onUrlAdd(url);
    setUrl('');
    setShowInput(false);
  };

  if (showInput) {
    return (
      <div className="flex-1 flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-lg px-2">
        <input
          type="text"
          autoFocus
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/article"
          className="flex-1 bg-transparent border-none outline-none text-sm text-white py-2"
          onKeyDown={(e) => e.key === 'Enter' && handleAddUrl()}
        />
        <Button
          variant="ghost"
          size="xs"
          onClick={handleAddUrl}
          className="text-indigo-400 hover:text-white"
        >
          确认
        </Button>
        <Button
          variant="ghost"
          size="xs"
          onClick={() => setShowInput(false)}
          className="text-gray-500 hover:text-gray-300"
        >
          <i className="fa-solid fa-xmark"></i>
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant="ghost"
      size="xs"
      onClick={() => setShowInput(true)}
      className="text-sm text-indigo-400 hover:text-indigo-300 flex items-center gap-1 px-3 py-1.5 rounded hover:bg-gray-700/50 transition"
    >
      <i className="fa-solid fa-link"></i>
      导入链接
    </Button>
  );
};

// ==================== Main Component ====================

export const InputStep: React.FC<InputStepProps> = ({
  config,
  onConfigChange,
  onSubmit,
  className = ''
}) => {
  const handleTextChange = (text: string) => {
    onConfigChange({ ...config, text });
  };

  const handleFileContent = (content: string) => {
    const newText = config.text ? `${config.text}\n\n${content}` : content;
    onConfigChange({ ...config, text: newText });
  };

  const handleUrlAdd = (url: string) => {
    const urlText = `Source URL: ${url}`;
    const newText = config.text ? `${config.text}\n\n${urlText}` : urlText;
    onConfigChange({ ...config, text: newText });
  };

  const currentStyle = config.selectedStyleId === 'custom'
    ? { name: '自定义', prompt: config.customStylePrompt }
    : STYLES.find(s => s.id === config.selectedStyleId) || STYLES[0];

  return (
    <div className={`max-w-3xl mx-auto p-6 bg-gray-800 rounded-xl border border-gray-700 shadow-2xl ${className}`}>
      <h2 className="text-2xl font-semibold mb-6">配置您的演示文稿</h2>

      {/* 输入源内容 */}
      <div className="mb-8">
        <label className="block text-gray-400 text-sm font-medium mb-2">
          输入源内容 (支持粘贴内容或链接)
        </label>
        <textarea
          className="w-full h-48 bg-gray-900 border border-gray-700 rounded-lg p-4 text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none transition-all"
          placeholder="在此粘贴文章内容、报告、者通过下方按钮导入链接..."
          value={config.text}
          onChange={(e) => handleTextChange(e.target.value)}
        />

        <div className="mt-3 flex justify-end gap-3">
          <UrlInput onUrlAdd={handleUrlAdd} />
          <FileUploadButton onFileSelect={handleFileContent} />
        </div>
      </div>

      {/* 配置选项格 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* 页面比例 */}
        <div className="col-span-1 md:col-span-2">
          <label className="block text-gray-400 text-sm font-medium mb-2">
            页面比例
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 bg-gray-900 rounded-lg border border-gray-700 p-1">
            {RATIO_OPTIONS.map((ratio) => (
              <button
                key={ratio.id}
                onClick={() => onConfigChange({ ...config, aspectRatio: ratio.id as AspectRatio })}
                className={`flex flex-col items-center justify-center gap-1 py-2 text-xs rounded-md transition-all ${
                  config.aspectRatio === ratio.id
                    ? 'bg-indigo-600 text-white shadow-lg'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <i className={`fa-solid ${ratio.icon} text-base`}></i>
                {ratio.name}
              </button>
            ))}
          </div>
        </div>

        {/* 生成画质 */}
        <div className="col-span-1 md:col-span-2">
          <label className="block text-gray-400 text-sm font-medium mb-2">
            生成画质 (4K 生成极慢且易过载)
          </label>
          <div className="grid grid-cols-3 gap-2 bg-gray-900 rounded-lg border border-gray-700 p-1">
            {QUALITY_OPTIONS.map((q) => (
              <button
                key={q.id}
                onClick={() => onConfigChange({ ...config, imageSize: q.id as ImageSize })}
                className={`flex flex-col items-center justify-center gap-0.5 py-2 rounded-md transition-all border ${
                  config.imageSize === q.id
                    ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-[0_0_15px_rgba(79,70,229,0.3)]'
                    : 'bg-transparent border-transparent text-gray-500 hover:text-gray-300'
                }`}
              >
                <span className="text-xs font-bold">{q.name}</span>
                <span className="text-[10px] opacity-60">{q.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 幻灯片页数 */}
        <div>
          <label className="block text-gray-400 text-sm font-medium mb-2">
            幻灯片页数 ({config.slideCount}页)
          </label>
          <div className="flex items-center gap-4 bg-gray-900 p-2 rounded-lg border border-gray-700 h-10">
            <input
              type="range"
              min="3"
              max="40"
              value={config.slideCount}
              onChange={(e) => onConfigChange({ ...config, slideCount: parseInt(e.target.value) })}
              className="flex-1 accent-indigo-500 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>

        {/* 内容详细度 */}
        <div>
          <label className="block text-gray-400 text-sm font-medium mb-2">
            内容详细度
          </label>
          <div className="flex bg-gray-900 rounded-lg border border-gray-700 p-1 h-10">
            {DETAIL_LEVELS.map((level) => (
              <button
                key={level.id}
                onClick={() => onConfigChange({ ...config, detailLevelId: level.id })}
                className={`flex-1 text-[10px] sm:text-xs rounded-md transition-colors ${
                  config.detailLevelId === level.id
                    ? 'bg-gray-700 text-white'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
                title={level.description}
              >
                {level.name.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 视觉风格 */}
      <div className="mb-8">
        <label className="block text-gray-400 text-sm font-medium mb-2">
          视觉风格
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {STYLES.map((style) => (
            <button
              key={style.id}
              onClick={() => onConfigChange({ ...config, selectedStyleId: style.id })}
              className={`p-3 rounded-lg border text-left transition-all ${
                config.selectedStyleId === style.id
                  ? 'bg-indigo-900/30 border-indigo-500 ring-1 ring-indigo-500'
                  : 'bg-gray-900 border-gray-700 hover:border-gray-500'
              }`}
            >
              <div
                className={`w-full h-8 mb-2 rounded bg-gradient-to-br ${
                  style.id === 'tech_minimal'
                    ? 'from-gray-800 to-black'
                    : style.id === 'corporate_blue'
                    ? 'from-blue-900 to-blue-700'
                    : style.id === 'creative_vibrant'
                    ? 'from-pink-500 to-yellow-500'
                    : style.id === 'editorial_clean'
                    ? 'from-gray-200 to-white'
                    : 'from-green-200 to-teal-200'
                }`}
              ></div>
              <div className="text-xs font-medium text-gray-300">{style.name}</div>
            </button>
          ))}
          <button
            onClick={() => onConfigChange({ ...config, selectedStyleId: 'custom' })}
            className={`p-3 rounded-lg border text-left transition-all ${
              config.selectedStyleId === 'custom'
                ? 'bg-indigo-900/30 border-indigo-500 ring-1 ring-indigo-500'
                : 'bg-gray-900 border-gray-700 hover:border-gray-500'
            }`}
          >
            <div className="w-full h-8 mb-2 rounded bg-gray-800 flex items-center justify-center border border-dashed border-gray-600">
              <i className="fa-solid fa-paint-roller text-gray-400"></i>
            </div>
            <div className="text-xs font-medium text-gray-300">自定义风格</div>
          </button>
        </div>

        {config.selectedStyleId === 'custom' && (
          <div className="mt-3">
            <textarea
              value={config.customStylePrompt}
              onChange={(e) => onConfigChange({ ...config, customStylePrompt: e.target.value })}
              placeholder="例如：极简中国风，水墨质感..."
              className="w-full h-20 bg-gray-900 border border-indigo-500/50 rounded-lg p-3 text-sm text-white focus:outline-none"
            />
          </div>
        )}
      </div>

      {/* 提交按钮 */}
      <Button
        variant="primary"
        size="lg"
        fullWidth
        onClick={onSubmit}
        icon="fa-solid fa-wand-magic-sparkles"
        disabled={!config.text.trim()}
      >
        开始规划大纲
      </Button>
    </div>
  );
};
