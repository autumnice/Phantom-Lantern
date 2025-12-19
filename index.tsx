import React, { useState, useRef, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI, Type } from "@google/genai";

// --- Types ---

interface SlidePlan {
  id: number;
  title: string;
  content: string; // Bullet points or short paragraph
  visualDescription: string;
}

interface SlideImage {
  id: number;
  base64: string | null;
  status: 'pending' | 'generating' | 'done' | 'error';
  prompt: string;
  errorMsg?: string;
}

type AppStep = 'input' | 'planning' | 'generating' | 'preview';

// --- Constants ---

const STYLES = [
  { id: 'tech_minimal', name: '科技极简', prompt: 'Minimalist tech style, dark background, neon accents, clean sans-serif typography, futuristic interface elements.' },
  { id: 'corporate_blue', name: '商务深蓝', prompt: 'Professional corporate style, deep blue and white theme, structured layout, business infographics, trustworthy atmosphere.' },
  { id: 'creative_vibrant', name: '创意多彩', prompt: 'Vibrant and creative, bold colors, artistic shapes, playful but legible typography, modern art direction.' },
  { id: 'editorial_clean', name: '杂志留白', prompt: 'High-end editorial design, ample whitespace, serif headings, elegant photography integration, sophisticated layout.' },
  { id: 'hand_drawn', name: '手绘风格', prompt: 'Hand-drawn illustration style, sketchbook texture, marker font, friendly and approachable vibe, pastel colors.' },
  // Custom style logic handled in component
];

const DETAIL_LEVELS = [
  { id: 'concise', name: '精简 (关键词)', description: '每页仅保留核心标题和极少量关键词。' },
  { id: 'moderate', name: '适中 (大纲)', description: '包含标题和3-5个关键点。' },
  { id: 'detailed', name: '详尽 (段落)', description: '包含较详细的解释性文本。' },
];

// --- Helper Functions ---

const getAI = () => {
  // Always create a new instance to ensure fresh state if needed, though mostly stateless.
  // Using process.env.API_KEY as strictly required.
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

// --- Components ---

const Header = () => (
  <header className="flex items-center justify-between px-6 py-4 bg-gray-900 border-b border-gray-800">
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center">
        <i className="fa-solid fa-bolt text-gray-900 text-lg"></i>
      </div>
      <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
        NanoDeck AI
      </h1>
    </div>
    <div className="text-sm text-gray-500">
      Powered by Gemini 3 Pro
    </div>
  </header>
);

const AuthScreen = ({ onConnect }: { onConnect: () => void }) => (
  <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4">
    <div className="max-w-md text-center space-y-6">
      <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-indigo-500/30">
        <i className="fa-solid fa-key text-2xl"></i>
      </div>
      <h1 className="text-3xl font-bold">需要访问权限</h1>
      <p className="text-gray-400">
        为了使用 <strong>Gemini 3 Pro (Nano Banana Pro)</strong> 生成高分辨率幻灯片，您需要连接一个启用了计费的 Google Cloud 项目 API 密钥。
      </p>
      <div className="bg-gray-800 p-4 rounded-lg text-sm text-left border border-gray-700">
        <p className="mb-2"><i className="fa-solid fa-circle-info text-indigo-400 mr-2"></i>说明：</p>
        <ul className="list-disc list-inside space-y-1 text-gray-300">
           <li>此模型支持生成 2K 高清图片。</li>
           <li>必须在 Google AI Studio 中选择付费项目。</li>
           <li><a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="text-indigo-400 underline">了解关于计费的更多信息</a></li>
        </ul>
      </div>
      <button 
        onClick={onConnect}
        className="w-full py-3 bg-white text-gray-900 font-bold rounded-lg hover:bg-gray-100 transition shadow-lg flex items-center justify-center gap-2"
      >
        <i className="fa-brands fa-google"></i> 连接 API 密钥
      </button>
    </div>
  </div>
);

const StepIndicator = ({ currentStep }: { currentStep: AppStep }) => {
  const steps: AppStep[] = ['input', 'planning', 'generating', 'preview'];
  const labels = ['内容源', '大纲规划', '视觉生成', '预览导出'];

  return (
    <div className="flex justify-center py-6">
      <div className="flex items-center gap-2">
        {steps.map((s, idx) => (
          <React.Fragment key={s}>
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              steps.indexOf(currentStep) >= idx ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-500'
            }`}>
              <span className="w-5 h-5 flex items-center justify-center rounded-full bg-black/20 text-xs">
                {idx + 1}
              </span>
              {labels[idx]}
            </div>
            {idx < steps.length - 1 && (
              <div className={`w-8 h-0.5 ${steps.indexOf(currentStep) > idx ? 'bg-indigo-600' : 'bg-gray-800'}`} />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

const InputSection = ({ onNext }: { onNext: (data: any) => void }) => {
  const [text, setText] = useState('');
  const [slideCount, setSlideCount] = useState(5);
  const [selectedStyleId, setSelectedStyleId] = useState(STYLES[0].id);
  const [customStylePrompt, setCustomStylePrompt] = useState('');
  const [detailLevel, setDetailLevel] = useState(DETAIL_LEVELS[1]);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState('');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type === 'text/plain' || file.name.endsWith('.md')) {
      const reader = new FileReader();
      reader.onload = (ev) => setText(prev => (prev ? prev + '\n\n' : '') + (ev.target?.result as string));
      reader.readAsText(file);
    } else {
      alert("当前演示环境主要支持 .txt / .md 文件。请直接粘贴 PDF/Word 内容到文本框以获得最佳效果。");
    }
  };

  const addUrlToText = () => {
    if (!urlInput.trim()) return;
    const newText = (text ? text + '\n\n' : '') + `Source URL: ${urlInput}\n(Please analyze the content from this link)`;
    setText(newText);
    setUrlInput('');
    setShowUrlInput(false);
  };

  const handleSubmit = () => {
    if (!text.trim()) return alert("请输入内容或导入文件/链接");
    
    let styleObj;
    if (selectedStyleId === 'custom') {
      if (!customStylePrompt.trim()) return alert("请输入自定义风格描述");
      styleObj = { 
        id: 'custom', 
        name: '自定义风格', 
        prompt: `Custom artistic style based on user description: "${customStylePrompt}". Creative, unique, consistent visual theme.` 
      };
    } else {
      styleObj = STYLES.find(s => s.id === selectedStyleId);
    }

    onNext({ text, slideCount, style: styleObj, detail: detailLevel });
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-gray-800 rounded-xl border border-gray-700 shadow-2xl">
      <h2 className="text-2xl font-semibold mb-6">配置您的演示文稿</h2>

      {/* Source Input */}
      <div className="mb-8">
        <label className="block text-gray-400 text-sm font-medium mb-2">输入源内容</label>
        <textarea
          className="w-full h-48 bg-gray-900 border border-gray-700 rounded-lg p-4 text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none"
          placeholder="在此粘贴文章、报告、笔记内容..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        ></textarea>
        
        <div className="mt-3 flex justify-end gap-3">
          {showUrlInput ? (
            <div className="flex-1 flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-lg px-2">
              <input 
                type="text" 
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://example.com/article"
                className="flex-1 bg-transparent border-none outline-none text-sm text-white py-2"
                onKeyDown={(e) => e.key === 'Enter' && addUrlToText()}
              />
              <button onClick={addUrlToText} className="text-indigo-400 hover:text-white text-sm font-medium">
                确认
              </button>
              <button onClick={() => setShowUrlInput(false)} className="text-gray-500 hover:text-gray-300">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setShowUrlInput(true)}
              className="text-sm text-indigo-400 hover:text-indigo-300 flex items-center gap-1 px-3 py-1.5 rounded hover:bg-gray-700/50 transition"
            >
              <i className="fa-solid fa-link"></i> 导入网站链接 (URL)
            </button>
          )}

          <label className="cursor-pointer text-sm text-indigo-400 hover:text-indigo-300 flex items-center gap-1 px-3 py-1.5 rounded hover:bg-gray-700/50 transition">
            <i className="fa-solid fa-paperclip"></i> 导入本地文本/MD
            <input type="file" className="hidden" accept=".txt,.md" onChange={handleFileUpload} />
          </label>
        </div>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div>
          <label className="block text-gray-400 text-sm font-medium mb-2">幻灯片页数 (3-40页)</label>
          <div className="flex items-center gap-4 bg-gray-900 p-2 rounded-lg border border-gray-700">
            <input 
              type="range" 
              min="3" 
              max="40" 
              value={slideCount} 
              onChange={(e) => setSlideCount(parseInt(e.target.value))}
              className="flex-1 accent-indigo-500 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
            <span className="w-12 text-center font-mono text-lg text-white">{slideCount}</span>
          </div>
        </div>

        <div>
           <label className="block text-gray-400 text-sm font-medium mb-2">内容详细度</label>
           <div className="flex bg-gray-900 rounded-lg border border-gray-700 p-1">
             {DETAIL_LEVELS.map(level => (
               <button
                 key={level.id}
                 onClick={() => setDetailLevel(level)}
                 className={`flex-1 py-1.5 text-xs rounded-md transition-colors ${detailLevel.id === level.id ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'}`}
               >
                 {level.name.split(' ')[0]}
               </button>
             ))}
           </div>
           <p className="text-xs text-gray-500 mt-1">{detailLevel.description}</p>
        </div>
      </div>

      {/* Style Selection */}
      <div className="mb-8">
        <label className="block text-gray-400 text-sm font-medium mb-2">视觉风格</label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {STYLES.map(style => (
            <button
              key={style.id}
              onClick={() => setSelectedStyleId(style.id)}
              className={`p-3 rounded-lg border text-left transition-all ${
                selectedStyleId === style.id 
                  ? 'bg-indigo-900/30 border-indigo-500 ring-1 ring-indigo-500' 
                  : 'bg-gray-900 border-gray-700 hover:border-gray-500'
              }`}
            >
              <div className={`w-full h-8 mb-2 rounded bg-gradient-to-br ${
                style.id === 'tech_minimal' ? 'from-gray-800 to-black' :
                style.id === 'corporate_blue' ? 'from-blue-900 to-blue-700' :
                style.id === 'creative_vibrant' ? 'from-pink-500 to-yellow-500' :
                style.id === 'editorial_clean' ? 'from-gray-200 to-white' : 'from-green-200 to-teal-200'
              }`}></div>
              <div className="text-xs font-medium text-gray-300">{style.name}</div>
            </button>
          ))}
          
          {/* Custom Style Button */}
          <button
              onClick={() => setSelectedStyleId('custom')}
              className={`p-3 rounded-lg border text-left transition-all ${
                selectedStyleId === 'custom'
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

        {/* Custom Style Input */}
        {selectedStyleId === 'custom' && (
          <div className="mt-3 animate-in fade-in slide-in-from-top-2 duration-300">
            <label className="block text-xs text-indigo-400 mb-1">描述您想要的风格 (Prompt)</label>
            <textarea
              value={customStylePrompt}
              onChange={(e) => setCustomStylePrompt(e.target.value)}
              placeholder="例如：哆啦A梦卡通风格，色彩鲜艳，充满童趣；或者：赛博朋克风格，霓虹灯效..."
              className="w-full h-20 bg-gray-900 border border-indigo-500/50 rounded-lg p-3 text-sm text-white focus:outline-none"
            />
          </div>
        )}
      </div>

      <button 
        onClick={handleSubmit}
        className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-lg shadow-lg transform transition hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
      >
        <i className="fa-solid fa-wand-magic-sparkles"></i>
        开始规划大纲
      </button>
    </div>
  );
};

const PlanningSection = ({ plan, setPlan, onGenerateImages, onBack }: { plan: SlidePlan[], setPlan: any, onGenerateImages: () => void, onBack: () => void }) => {
  const updateSlide = (index: number, field: keyof SlidePlan, value: string) => {
    const newPlan = [...plan];
    newPlan[index] = { ...newPlan[index], [field]: value };
    setPlan(newPlan);
  };

  return (
    <div className="max-w-5xl mx-auto h-[calc(100vh-200px)] flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold">大纲规划</h2>
        <div className="flex gap-3">
           <button onClick={onBack} className="px-4 py-2 text-gray-400 hover:text-white transition-colors">
            返回
          </button>
          <button 
            onClick={onGenerateImages}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg shadow flex items-center gap-2"
          >
            <i className="fa-solid fa-paintbrush"></i>
            确认并生成 PPT
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 space-y-4">
        {plan.map((slide, idx) => (
          <div key={slide.id} className="bg-gray-800 rounded-lg p-4 border border-gray-700 flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center font-bold text-gray-400">
              {idx + 1}
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wider">标题</label>
                <input 
                  type="text" 
                  value={slide.title}
                  onChange={(e) => updateSlide(idx, 'title', e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white font-semibold focus:border-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wider">正文内容</label>
                <textarea 
                  value={slide.content}
                  onChange={(e) => updateSlide(idx, 'content', e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-gray-300 text-sm focus:border-indigo-500 outline-none h-24 resize-y"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wider">画面描述 (Visual Prompt)</label>
                <input 
                  type="text" 
                  value={slide.visualDescription}
                  onChange={(e) => updateSlide(idx, 'visualDescription', e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-gray-400 text-xs focus:border-indigo-500 outline-none"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const EditorModal = ({ 
  isOpen, 
  onClose, 
  slideImage, 
  slidePlan, 
  onRegenerate, 
  styleName 
}: { 
  isOpen: boolean;
  onClose: () => void;
  slideImage: SlideImage;
  slidePlan: SlidePlan;
  onRegenerate: (id: number, customPrompt: string) => void;
  styleName: string;
}) => {
  const [prompt, setPrompt] = useState('');

  useEffect(() => {
    if (isOpen) {
      // Initialize with existing prompt or construct a readable one
      setPrompt(slideImage.prompt || slidePlan.visualDescription);
    }
  }, [isOpen, slideImage, slidePlan]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-gray-900 rounded-2xl w-full max-w-6xl h-[85vh] flex overflow-hidden border border-gray-700 shadow-2xl">
        {/* Left: Image View */}
        <div className="w-2/3 bg-black flex items-center justify-center relative border-r border-gray-800">
           {slideImage.status === 'generating' ? (
             <div className="text-center">
                <i className="fa-solid fa-circle-notch fa-spin text-4xl text-indigo-500 mb-4"></i>
                <p className="text-gray-400">Gemini 正在重绘...</p>
             </div>
           ) : slideImage.base64 ? (
             <img src={slideImage.base64} className="max-w-full max-h-full object-contain shadow-2xl" />
           ) : (
             <div className="text-center px-4">
                <div className="text-red-400 text-lg mb-2"><i className="fa-solid fa-triangle-exclamation"></i> 图片加载失败</div>
                <div className="text-gray-500 text-sm">{slideImage.errorMsg || "未知错误"}</div>
             </div>
           )}
           
           <button onClick={onClose} className="absolute top-4 left-4 bg-black/50 hover:bg-black/70 text-white rounded-full w-10 h-10 flex items-center justify-center transition">
             <i className="fa-solid fa-xmark"></i>
           </button>
        </div>

        {/* Right: Controls */}
        <div className="w-1/3 flex flex-col p-6 bg-gray-800">
          <h3 className="text-xl font-bold mb-1">编辑幻灯片 {slideImage.id}</h3>
          <p className="text-sm text-gray-500 mb-6">风格: {styleName}</p>

          <div className="flex-1 overflow-y-auto space-y-6">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                当前文字内容 (只读)
              </label>
              <div className="bg-gray-900 p-3 rounded border border-gray-700 text-sm text-gray-300">
                <div className="font-bold mb-1">{slidePlan.title}</div>
                <div className="whitespace-pre-wrap">{slidePlan.content}</div>
              </div>
              <p className="text-xs text-gray-500 mt-1">如需修改文字，请回到大纲规划阶段，或者直接在下方提示词中强调。</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                修改生成提示词 (Prompt)
              </label>
              <textarea 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full h-40 bg-gray-900 border border-gray-700 rounded-lg p-3 text-gray-200 text-sm focus:border-indigo-500 outline-none resize-none"
                placeholder="描述你想要的画面，或者修改排版要求..."
              />
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-700">
            <button 
              onClick={() => onRegenerate(slideImage.id, prompt)}
              disabled={slideImage.status === 'generating'}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold rounded-lg transition flex items-center justify-center gap-2"
            >
              {slideImage.status === 'generating' ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin"></i> 处理中...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-rotate-right"></i> 重新生成此页
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ResultsSection = ({ 
  slides, 
  plan, 
  onEditSlide, 
  onExport 
}: { 
  slides: SlideImage[]; 
  plan: SlidePlan[];
  onEditSlide: (id: number) => void;
  onExport: (type: 'pdf' | 'ppt') => void;
}) => {
  return (
    <div className="max-w-7xl mx-auto pb-12">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-semibold">生成结果预览</h2>
        <div className="flex gap-3">
          <button 
            onClick={() => onExport('pdf')}
            className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 hover:text-red-300 border border-red-600/50 rounded-lg transition flex items-center gap-2"
          >
            <i className="fa-solid fa-file-pdf"></i> 导出 PDF
          </button>
          <button 
            onClick={() => onExport('ppt')}
            className="px-4 py-2 bg-orange-600/20 hover:bg-orange-600/30 text-orange-400 hover:text-orange-300 border border-orange-600/50 rounded-lg transition flex items-center gap-2"
          >
            <i className="fa-solid fa-file-powerpoint"></i> 导出 PPT
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {slides.map((slide, idx) => (
          <div key={slide.id} className="group relative aspect-video bg-gray-800 rounded-xl border border-gray-700 shadow-lg overflow-hidden hover:border-indigo-500 transition-colors">
            {slide.status === 'done' && slide.base64 ? (
              <img src={slide.base64} alt={`Slide ${slide.id}`} className="w-full h-full object-cover" />
            ) : slide.status === 'error' ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-red-400 p-4 text-center bg-gray-900/50">
                 <i className="fa-solid fa-triangle-exclamation text-3xl mb-2"></i>
                 <p className="font-bold">生成失败</p>
                 <p className="text-xs text-red-300 mt-1 max-w-[80%]">{slide.errorMsg || "请重试或检查连接"}</p>
              </div>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-gray-500">
                <i className="fa-solid fa-circle-notch fa-spin text-3xl mb-3 text-indigo-500"></i>
                <p className="text-sm font-medium animate-pulse">
                  {slide.status === 'pending' ? '等待处理...' : 'Nano Banana 正在绘制...'}
                </p>
              </div>
            )}
            
            {/* Overlay Actions */}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
              <button 
                onClick={() => onEditSlide(slide.id)}
                className="bg-white text-gray-900 px-4 py-2 rounded-full font-bold hover:bg-gray-200 transform hover:scale-105 transition"
              >
                <i className="fa-solid fa-pen-to-square mr-2"></i> 编辑 / 详情
              </button>
            </div>
            
            <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 rounded text-xs text-white font-mono pointer-events-none">
              P.{idx + 1}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- Main App ---

const App = () => {
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [step, setStep] = useState<AppStep>('input');
  const [config, setConfig] = useState<any>(null);
  const [plan, setPlan] = useState<SlidePlan[]>([]);
  const [slides, setSlides] = useState<SlideImage[]>([]);
  const [editingSlideId, setEditingSlideId] = useState<number | null>(null);

  useEffect(() => {
    checkKey();
  }, []);

  const checkKey = async () => {
    try {
      if ((window as any).aistudio && (window as any).aistudio.hasSelectedApiKey) {
        const has = await (window as any).aistudio.hasSelectedApiKey();
        setHasKey(has);
      } else {
        setHasKey(true); 
      }
    } catch (e) {
      console.error(e);
      setHasKey(false);
    }
  };

  const handleConnectKey = async () => {
    if ((window as any).aistudio && (window as any).aistudio.openSelectKey) {
        await (window as any).aistudio.openSelectKey();
        setHasKey(true);
    }
  };

  // 1. Plan Generation
  const handleConfigSubmit = async (data: any) => {
    setConfig(data);
    setStep('planning');
    
    // Call Gemini Flash to generate JSON plan
    const ai = getAI();
    const prompt = `
      You are a professional presentation architect.
      Source Content: "${data.text.slice(0, 15000)}"
      
      Task: Create a ${data.slideCount}-slide presentation structure based on the source content.
      Style: ${data.style.name}
      Style Description (for visual context): ${data.style.prompt}
      Detail Level: ${data.detail.name}
      Language: Chinese (Simplified)

      Output MUST be a strict JSON array. No markdown, no backticks.
      Format: [{"id": 1, "title": "...", "content": "...", "visualDescription": "..."}, ...]

      Each object must have:
      - id: number (1 to ${data.slideCount})
      - title: string (The slide title, concise)
      - content: string (The body text, bullet points or paragraph based on detail level. Max 100 words.)
      - visualDescription: string (A highly detailed English prompt for an image generator describing the slide layout, background, and imagery that matches the provided style description. Do NOT include the text content in this description, only the visual elements.)
    `;

    try {
      // Check for URL-like content to conditionally enable Google Search
      const hasUrl = data.text.includes('http://') || data.text.includes('https://') || data.text.includes('Source URL:');
      const tools = hasUrl ? [{googleSearch: {}}] : undefined;

      const resp = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          // Do NOT use responseMimeType or responseSchema when googleSearch is enabled.
          tools: tools,
        }
      });
      
      if (resp.text) {
        let cleanText = resp.text.trim();
        // Remove markdown formatting if present
        if (cleanText.startsWith('```json')) {
            cleanText = cleanText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanText.startsWith('```')) {
            cleanText = cleanText.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }

        try {
          const generatedPlan = JSON.parse(cleanText);
          if (Array.isArray(generatedPlan)) {
            setPlan(generatedPlan);
          } else {
            throw new Error("Invalid JSON structure");
          }
        } catch (parseError) {
          console.error("JSON Parse Error:", parseError, cleanText);
          alert("无法解析大纲，请重试。");
          setStep('input');
        }
      }
    } catch (e) {
      console.error(e);
      alert("大纲生成失败，请重试。");
      setStep('input');
    }
  };

  // 2. Image Generation (Batch)
  const handleStartGeneration = async () => {
    setStep('generating');
    // Initialize slides with pending status
    const initialSlides: SlideImage[] = plan.map(p => ({
      id: p.id,
      base64: null,
      status: 'pending',
      prompt: constructPrompt(p, config.style)
    }));
    setSlides(initialSlides);
    
    // Start processing queue (Serial to avoid rate limits, or small batch)
    // We will do one by one for stability in this demo
    setStep('preview'); // Move to preview immediately and update statuses there
    
    for (const slide of initialSlides) {
      await generateSlideImage(slide.id, slide.prompt);
    }
  };

  const constructPrompt = (slide: SlidePlan, style: any) => {
    // This prompt needs to be crafted for Gemini 3 Pro to render text
    return `
      Create a high-quality presentation slide image.
      Aspect Ratio: 16:9.
      Style: ${style.prompt}
      
      CRITICAL INSTRUCTION: You MUST RENDER the following text on the slide image clearly and legibly in Chinese (Simplified).
      
      Title: "${slide.title}"
      Body Text: "${slide.content}"
      
      Layout: Professional presentation layout. Ensure high contrast between text and background. No typos.
      Additional Visuals: ${slide.visualDescription}
    `;
  };

  const generateSlideImage = async (id: number, prompt: string, retryCount = 0) => {
    setSlides(prev => prev.map(s => s.id === id ? { ...s, status: 'generating' } : s));
    
    const ai = getAI();
    try {
      const resp = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: prompt,
        config: {
          imageConfig: {
             aspectRatio: '16:9',
             // Removed '2K' size to improve stability and avoid 500 errors
          }
        }
      });

      let base64 = null;
      // Extract image from parts
      if (resp.candidates?.[0]?.content?.parts) {
        for (const part of resp.candidates[0].content.parts) {
          if (part.inlineData) {
            base64 = `data:image/png;base64,${part.inlineData.data}`;
            break;
          }
        }
      }

      if (base64) {
        setSlides(prev => prev.map(s => s.id === id ? { ...s, status: 'done', base64, prompt, errorMsg: undefined } : s));
      } else {
         throw new Error("No image data found");
      }
    } catch (e: any) {
      console.error(`Slide ${id} failed (Attempt ${retryCount + 1})`, e);
      
      // Retry Logic for 5xx errors
      if ((e.status >= 500 && e.status < 600) && retryCount < 2) {
         console.log(`Retrying slide ${id}...`);
         await new Promise(resolve => setTimeout(resolve, 2000 * (retryCount + 1)));
         return generateSlideImage(id, prompt, retryCount + 1);
      }

      let errorMsg = "生成失败";
      if (e.message?.includes('403') || e.status === 403 || e.message?.includes('PERMISSION_DENIED')) {
          errorMsg = "权限拒绝：请检查 API Key 是否关联了付费项目。";
      } else if (e.status === 500) {
          errorMsg = "服务器忙 (500)，请稍后重试。";
      }
      setSlides(prev => prev.map(s => s.id === id ? { ...s, status: 'error', errorMsg } : s));
    }
  };

  const handleRegenerateSlide = (id: number, customPrompt: string) => {
    generateSlideImage(id, customPrompt);
  };

  const handleExport = async (type: 'pdf' | 'ppt') => {
    if (type === 'ppt') {
      const pptx = new (window as any).PptxGenJS();
      pptx.layout = 'LAYOUT_16x9';
      
      slides.forEach(slide => {
        const s = pptx.addSlide();
        if (slide.base64) {
          s.background = { data: slide.base64 };
        } else {
          s.addText("Image generation failed", { x: 1, y: 1 });
        }
      });
      
      pptx.writeFile({ fileName: `NanoDeck-Presentation.pptx` });
    } else {
      const { jsPDF } = (window as any).jspdf;
      const doc = new jsPDF({ orientation: 'landscape', unit: 'px', format: [1920, 1080] });
      
      slides.forEach((slide, index) => {
        if (index > 0) doc.addPage();
        if (slide.base64) {
          doc.addImage(slide.base64, 'PNG', 0, 0, 1920, 1080);
        }
      });
      
      doc.save(`NanoDeck-Presentation.pdf`);
    }
  };

  if (hasKey === false) {
    return <AuthScreen onConnect={handleConnectKey} />;
  }

  if (hasKey === null) {
      return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-gray-500">
          <i className="fa-solid fa-circle-notch fa-spin text-2xl"></i>
      </div>;
  }

  return (
    <div className="min-h-screen font-sans">
      <Header />
      
      <main className="container mx-auto px-4">
        <StepIndicator currentStep={step} />

        {step === 'input' && (
          <InputSection onNext={handleConfigSubmit} />
        )}

        {step === 'planning' && (
          <PlanningSection 
            plan={plan} 
            setPlan={setPlan} 
            onGenerateImages={handleStartGeneration}
            onBack={() => setStep('input')}
          />
        )}

        {(step === 'generating' || step === 'preview') && (
          <ResultsSection 
            slides={slides} 
            plan={plan}
            onEditSlide={setEditingSlideId}
            onExport={handleExport}
          />
        )}
      </main>

      {/* Editor Modal */}
      {editingSlideId && (
        <EditorModal 
          isOpen={!!editingSlideId}
          onClose={() => setEditingSlideId(null)}
          slideImage={slides.find(s => s.id === editingSlideId)!}
          slidePlan={plan.find(p => p.id === editingSlideId)!}
          onRegenerate={handleRegenerateSlide}
          styleName={config?.style?.name || ''}
        />
      )}
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
