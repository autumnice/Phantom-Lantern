
import React, { useState, useRef, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI, Type } from "@google/genai";

// --- Types ---

interface SlidePlan {
  id: number;
  title: string;
  content: string;
  visualDescription: string;
}

interface SlideImage {
  id: number;
  base64: string | null;
  status: 'pending' | 'generating' | 'done' | 'error';
  prompt: string;
  errorMsg?: string;
}

type AspectRatio = '16:9' | '4:3' | '1:1' | '3:4' | '9:16';
type AppStep = 'input' | 'planning' | 'generating' | 'preview';

// --- Constants ---

const STYLES = [
  { id: 'tech_minimal', name: '科技极简', prompt: 'Minimalist tech style, dark background, neon accents, clean sans-serif typography, futuristic interface elements.' },
  { id: 'corporate_blue', name: '商务深蓝', prompt: 'Professional corporate style, deep blue and white theme, structured layout, business infographics, trustworthy atmosphere.' },
  { id: 'creative_vibrant', name: '创意多彩', prompt: 'Vibrant and creative, bold colors, artistic shapes, playful but legible typography, modern art direction.' },
  { id: 'editorial_clean', name: '杂志留白', prompt: 'High-end editorial design, ample whitespace, serif headings, elegant photography integration, sophisticated layout.' },
  { id: 'hand_drawn', name: '手绘风格', prompt: 'Hand-drawn illustration style, sketchbook texture, marker font, friendly and approachable vibe, pastel colors.' },
];

const DETAIL_LEVELS = [
  { id: 'concise', name: '精简 (关键词)', description: '每页仅保留核心标题和极少量关键词。' },
  { id: 'moderate', name: '适中 (大纲)', description: '包含标题 and 3-5个关键点。' },
  { id: 'detailed', name: '详尽 (段落)', description: '包含较详细的解释性文本。' },
];

const RATIO_OPTIONS: { id: AspectRatio; name: string; icon: string }[] = [
  { id: '16:9', name: '宽屏 16:9', icon: 'fa-desktop' },
  { id: '4:3', name: '标准 4:3', icon: 'fa-tv' },
  { id: '1:1', name: '正方形 1:1', icon: 'fa-square' },
  { id: '3:4', name: '书籍 3:4', icon: 'fa-book-open' },
  { id: '9:16', name: '竖屏 9:16', icon: 'fa-mobile-screen' },
];

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
    <div className="text-sm text-gray-500">Powered by Gemini 3 Pro</div>
  </header>
);

const LoadingOverlay = ({ message }: { message: string }) => (
  <div className="fixed inset-0 z-[100] bg-gray-950/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
    <div className="relative w-24 h-24 mb-8">
      <div className="absolute inset-0 border-4 border-indigo-500/20 rounded-full"></div>
      <div className="absolute inset-0 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      <div className="absolute inset-4 bg-indigo-500/10 rounded-full flex items-center justify-center">
        <i className="fa-solid fa-brain text-2xl text-indigo-400 animate-pulse"></i>
      </div>
    </div>
    <h3 className="text-2xl font-bold text-white mb-2">AI 深度规划中</h3>
    <p className="text-gray-400 max-w-md leading-relaxed">{message}</p>
    <div className="mt-8 flex gap-2">
      <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
      <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
      <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce"></div>
    </div>
  </div>
);

const InputSection = ({ 
  state, 
  setState, 
  onNext 
}: { 
  state: any; 
  setState: (s: any) => void; 
  onNext: () => void;
}) => {
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState('');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setState({ ...state, text: (state.text ? state.text + '\n\n' : '') + (ev.target?.result as string) });
    reader.readAsText(file);
  };

  const addUrlToText = () => {
    if (!urlInput.trim()) return;
    setState({ ...state, text: (state.text ? state.text + '\n\n' : '') + `Source URL: ${urlInput}` });
    setUrlInput('');
    setShowUrlInput(false);
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-gray-800 rounded-xl border border-gray-700 shadow-2xl animate-in fade-in zoom-in-95 duration-300">
      <h2 className="text-2xl font-semibold mb-6">配置您的演示文稿</h2>

      <div className="mb-8">
        <label className="block text-gray-400 text-sm font-medium mb-2">输入源内容 (支持粘贴内容或链接)</label>
        <textarea
          className="w-full h-48 bg-gray-900 border border-gray-700 rounded-lg p-4 text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none transition-all"
          placeholder="在此粘贴文章内容、报告、或者通过下方按钮导入链接..."
          value={state.text}
          onChange={(e) => setState({ ...state, text: e.target.value })}
        ></textarea>
        
        <div className="mt-3 flex justify-end gap-3">
          {showUrlInput ? (
            <div className="flex-1 flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-lg px-2">
              <input 
                type="text" 
                autoFocus
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://example.com/article"
                className="flex-1 bg-transparent border-none outline-none text-sm text-white py-2"
                onKeyDown={(e) => e.key === 'Enter' && addUrlToText()}
              />
              <button onClick={addUrlToText} className="text-indigo-400 hover:text-white text-sm font-medium">确认</button>
              <button onClick={() => setShowUrlInput(false)} className="text-gray-500 hover:text-gray-300"><i className="fa-solid fa-xmark"></i></button>
            </div>
          ) : (
            <button 
              onClick={() => setShowUrlInput(true)}
              className="text-sm text-indigo-400 hover:text-indigo-300 flex items-center gap-1 px-3 py-1.5 rounded hover:bg-gray-700/50 transition"
            >
              <i className="fa-solid fa-link"></i> 导入链接
            </button>
          )}

          <label className="cursor-pointer text-sm text-indigo-400 hover:text-indigo-300 flex items-center gap-1 px-3 py-1.5 rounded hover:bg-gray-700/50 transition">
            <i className="fa-solid fa-paperclip"></i> 导入文件
            <input type="file" className="hidden" accept=".txt,.md" onChange={handleFileUpload} />
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="col-span-1 md:col-span-2">
          <label className="block text-gray-400 text-sm font-medium mb-2">页面比例</label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 bg-gray-900 rounded-lg border border-gray-700 p-1">
            {RATIO_OPTIONS.map((ratio) => (
              <button
                key={ratio.id}
                onClick={() => setState({ ...state, aspectRatio: ratio.id })}
                className={`flex flex-col items-center justify-center gap-1 py-2 text-xs rounded-md transition-all ${
                  state.aspectRatio === ratio.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <i className={`fa-solid ${ratio.icon} text-base`}></i>
                {ratio.name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-gray-400 text-sm font-medium mb-2">幻灯片页数 ({state.slideCount}页)</label>
          <div className="flex items-center gap-4 bg-gray-900 p-2 rounded-lg border border-gray-700 h-10">
            <input 
              type="range" min="3" max="40" 
              value={state.slideCount} 
              onChange={(e) => setState({ ...state, slideCount: parseInt(e.target.value) })}
              className="flex-1 accent-indigo-500 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>

        <div>
          <label className="block text-gray-400 text-sm font-medium mb-2">内容详细度</label>
          <div className="flex bg-gray-900 rounded-lg border border-gray-700 p-1 h-10">
            {DETAIL_LEVELS.map(level => (
              <button
                key={level.id}
                onClick={() => setState({ ...state, detailLevelId: level.id })}
                className={`flex-1 text-[10px] sm:text-xs rounded-md transition-colors ${state.detailLevelId === level.id ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'}`}
              >
                {level.name.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mb-8">
        <label className="block text-gray-400 text-sm font-medium mb-2">视觉风格</label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {STYLES.map(style => (
            <button
              key={style.id}
              onClick={() => setState({ ...state, selectedStyleId: style.id })}
              className={`p-3 rounded-lg border text-left transition-all ${
                state.selectedStyleId === style.id 
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
          <button
              onClick={() => setState({ ...state, selectedStyleId: 'custom' })}
              className={`p-3 rounded-lg border text-left transition-all ${
                state.selectedStyleId === 'custom' ? 'bg-indigo-900/30 border-indigo-500 ring-1 ring-indigo-500' : 'bg-gray-900 border-gray-700 hover:border-gray-500'
              }`}
            >
              <div className="w-full h-8 mb-2 rounded bg-gray-800 flex items-center justify-center border border-dashed border-gray-600">
                 <i className="fa-solid fa-paint-roller text-gray-400"></i>
              </div>
              <div className="text-xs font-medium text-gray-300">自定义风格</div>
            </button>
        </div>

        {state.selectedStyleId === 'custom' && (
          <div className="mt-3">
            <textarea
              value={state.customStylePrompt}
              onChange={(e) => setState({ ...state, customStylePrompt: e.target.value })}
              placeholder="例如：极简中国风，水墨质感..."
              className="w-full h-20 bg-gray-900 border border-indigo-500/50 rounded-lg p-3 text-sm text-white focus:outline-none"
            />
          </div>
        )}
      </div>

      <button 
        onClick={onNext}
        className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-lg shadow-lg transform transition hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
      >
        <i className="fa-solid fa-wand-magic-sparkles"></i>
        开始规划大纲
      </button>
    </div>
  );
};

// --- App Component ---

const App = () => {
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [step, setStep] = useState<AppStep>('input');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  
  // Persistent Input State
  const [inputState, setInputState] = useState({
    text: '',
    slideCount: 5,
    aspectRatio: '16:9' as AspectRatio,
    selectedStyleId: STYLES[0].id,
    customStylePrompt: '',
    detailLevelId: DETAIL_LEVELS[1].id
  });

  const [plan, setPlan] = useState<SlidePlan[]>([]);
  const [slides, setSlides] = useState<SlideImage[]>([]);
  const [editingSlideId, setEditingSlideId] = useState<number | null>(null);

  useEffect(() => {
    const check = async () => {
      if ((window as any).aistudio?.hasSelectedApiKey) {
        setHasKey(await (window as any).aistudio.hasSelectedApiKey());
      } else setHasKey(true);
    };
    check();
  }, []);

  const handleConfigSubmit = async () => {
    if (!inputState.text.trim()) return alert("请先输入内容或链接");
    
    setIsLoading(true);
    setLoadingMsg("正在分析您的内容，请稍候...");
    
    const styleObj = inputState.selectedStyleId === 'custom' 
      ? { name: '自定义', prompt: inputState.customStylePrompt }
      : STYLES.find(s => s.id === inputState.selectedStyleId);
    
    const detailObj = DETAIL_LEVELS.find(l => l.id === inputState.detailLevelId);

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `
      Presentation Architect Mode.
      User wants a ${inputState.slideCount}-slide presentation.
      Aspect Ratio: ${inputState.aspectRatio}.
      Visual Style: ${styleObj?.prompt}.
      Detail Level: ${detailObj?.name}.
      
      SOURCE CONTENT OR LINK:
      "${inputState.text}"

      TASK: 
      1. Analyze the content (use search tool if URL is provided).
      2. Create a slide-by-slide plan that fits the ${inputState.aspectRatio} format.
      3. For each slide, provide a Title, Content, and a detailed Visual Description (English prompt for image gen).
      
      Output format: STRICT JSON ARRAY of objects: 
      [{"id": 1, "title": "...", "content": "...", "visualDescription": "..."}]
      
      Language: Chinese (Simplified).
    `;

    try {
      const resp = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: { 
          tools: inputState.text.includes('http') ? [{googleSearch: {}}] : undefined,
          responseMimeType: "application/json"
        }
      });
      
      const resText = resp.text.trim();
      const generatedPlan = JSON.parse(resText);
      setPlan(generatedPlan);
      setStep('planning');
    } catch (e: any) {
      console.error(e);
      if (e.message?.includes("Requested entity was not found")) {
        setHasKey(false);
        alert("所选 API 密钥的项目未启用计费，请重新选择。");
      } else {
        alert("大纲规划失败。请检查内容或重试。");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartGeneration = async () => {
    setStep('generating');
    const styleObj = inputState.selectedStyleId === 'custom' 
      ? { name: '自定义', prompt: inputState.customStylePrompt }
      : STYLES.find(s => s.id === inputState.selectedStyleId);

    const initialSlides: SlideImage[] = plan.map(p => ({
      id: p.id,
      base64: null,
      status: 'pending',
      prompt: `Create a professional ${inputState.aspectRatio} presentation slide. Style: ${styleObj?.prompt}. 
               Visual elements: ${p.visualDescription}. 
               REQUIRED: Render Title "${p.title}" and Content "${p.content}" in Chinese (Simplified).`
    }));
    setSlides(initialSlides);
    setStep('preview');
    
    for (const slide of initialSlides) {
      await generateSingleSlide(slide.id, slide.prompt);
    }
  };

  const generateSingleSlide = async (id: number, prompt: string, retry = 0) => {
    // Force status to generating to trigger loading UI
    setSlides(prev => prev.map(s => s.id === id ? { ...s, status: 'generating' } : s));
    
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
      const resp = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: prompt,
        config: { imageConfig: { aspectRatio: inputState.aspectRatio } }
      });
      
      let base64 = null;
      if (resp.candidates?.[0]?.content?.parts) {
        for (const part of resp.candidates[0].content.parts) {
          if (part.inlineData) {
            base64 = `data:image/png;base64,${part.inlineData.data}`;
            break;
          }
        }
      }
      if (base64) setSlides(prev => prev.map(s => s.id === id ? { ...s, status: 'done', base64, prompt } : s));
      else throw new Error("No image data");
    } catch (e: any) {
      if (e.message?.includes("Requested entity was not found")) setHasKey(false);
      if (e.status === 500 && retry < 2) {
        await new Promise(r => setTimeout(r, 3000));
        return generateSingleSlide(id, prompt, retry + 1);
      }
      setSlides(prev => prev.map(s => s.id === id ? { ...s, status: 'error', errorMsg: "生成失败" } : s));
    }
  };

  const handleExport = (type: 'pdf' | 'ppt') => {
    // Determine orientation for libraries
    const ratio = inputState.aspectRatio;
    
    if (type === 'ppt') {
      const pptx = new (window as any).PptxGenJS();
      
      // Map ratios to PPTX layouts or custom definitions
      if (ratio === '16:9') pptx.layout = 'LAYOUT_16x9';
      else if (ratio === '4:3') pptx.layout = 'LAYOUT_4x3';
      else if (ratio === '1:1') {
        pptx.defineLayout({ name: 'SQUARE', width: 10, height: 10 });
        pptx.layout = 'SQUARE';
      } else if (ratio === '3:4') {
        pptx.defineLayout({ name: 'PORTRAIT_3_4', width: 7.5, height: 10 });
        pptx.layout = 'PORTRAIT_3_4';
      } else if (ratio === '9:16') {
        pptx.defineLayout({ name: 'PORTRAIT_9_16', width: 5.625, height: 10 });
        pptx.layout = 'PORTRAIT_9_16';
      }
      
      slides.forEach(s => {
        if (s.base64) {
          const slide = pptx.addSlide();
          slide.background = { data: s.base64 };
        }
      });
      pptx.writeFile({ fileName: `NanoDeck-${Date.now()}.pptx` });
    } else {
      const { jsPDF } = (window as any).jspdf;
      
      // Calculate pixel dimensions for PDF based on ratios (base 1080p width/height)
      let width = 1920, height = 1080, orientation: 'p' | 'l' = 'l';
      
      if (ratio === '16:9') { width = 1920; height = 1080; orientation = 'l'; }
      else if (ratio === '4:3') { width = 1440; height = 1080; orientation = 'l'; }
      else if (ratio === '1:1') { width = 1440; height = 1440; orientation = 'p'; }
      else if (ratio === '3:4') { width = 1080; height = 1440; orientation = 'p'; }
      else if (ratio === '9:16') { width = 1080; height = 1920; orientation = 'p'; }
      
      const doc = new jsPDF({ orientation, unit: 'px', format: [width, height] });
      
      slides.forEach((s, i) => {
        if (i > 0) doc.addPage([width, height], orientation);
        if (s.base64) doc.addImage(s.base64, 'PNG', 0, 0, width, height);
      });
      doc.save(`NanoDeck-${Date.now()}.pdf`);
    }
  };

  const getAspectClass = (ratio: AspectRatio) => {
    switch (ratio) {
      case '16:9': return 'aspect-video';
      case '4:3': return 'aspect-[4/3]';
      case '1:1': return 'aspect-square';
      case '3:4': return 'aspect-[3/4]';
      case '9:16': return 'aspect-[9/16]';
      default: return 'aspect-video';
    }
  };

  if (hasKey === false) return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-20 h-20 bg-indigo-500/10 rounded-3xl flex items-center justify-center mb-6">
        <i className="fa-solid fa-key text-3xl text-indigo-500"></i>
      </div>
      <h2 className="text-2xl font-bold mb-4">需要连接 API 密钥</h2>
      <p className="text-gray-400 mb-8 max-w-sm">需使用付费 GCP 项目 API 密钥以访问 Gemini 3 Pro 系列模型。</p>
      <button onClick={() => (window as any).aistudio.openSelectKey().then(() => setHasKey(true))} className="px-8 py-3 bg-indigo-600 rounded-xl font-bold shadow-lg transition hover:bg-indigo-500">连接密钥</button>
    </div>
  );
  
  if (hasKey === null) return null;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-sans">
      <Header />
      {isLoading && <LoadingOverlay message={loadingMsg} />}
      
      <main className="container mx-auto px-4 py-8">
        {step !== 'preview' && (
          <div className="flex justify-center mb-8">
            <div className="flex items-center gap-4 text-xs sm:text-sm font-medium">
              <span className={`px-3 py-1 rounded-full ${step === 'input' ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-500'}`}>1. 设置</span>
              <div className="w-6 sm:w-8 h-px bg-gray-800"></div>
              <span className={`px-3 py-1 rounded-full ${step === 'planning' ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-500'}`}>2. 大纲</span>
              <div className="w-6 sm:w-8 h-px bg-gray-800"></div>
              <span className={`px-3 py-1 rounded-full ${step === 'preview' ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-500'}`}>3. 生成</span>
            </div>
          </div>
        )}

        {step === 'input' && <InputSection state={inputState} setState={setInputState} onNext={handleConfigSubmit} />}
        
        {step === 'planning' && (
          <div className="max-w-5xl mx-auto flex flex-col h-[calc(100vh-250px)] animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl sm:text-2xl font-bold">大纲规划</h2>
              <div className="flex gap-4">
                <button onClick={() => setStep('input')} className="text-sm text-gray-400 hover:text-white transition">返回修改</button>
                <button onClick={handleStartGeneration} className="px-4 sm:px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-lg shadow-lg transition">开始绘图</button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto pr-4 space-y-4">
              {plan.map((p, i) => (
                <div key={p.id} className="bg-gray-800 p-4 rounded-xl border border-gray-700 flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-gray-700 flex-shrink-0 flex items-center justify-center font-bold text-sm">{i+1}</div>
                  <div className="flex-1 space-y-3">
                    <input className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm font-semibold" value={p.title} onChange={(e) => {
                      const newPlan = [...plan]; newPlan[i].title = e.target.value; setPlan(newPlan);
                    }} />
                    <textarea className="w-full h-24 bg-gray-900 border border-gray-700 rounded px-3 py-2 text-xs leading-relaxed" value={p.content} onChange={(e) => {
                      const newPlan = [...plan]; newPlan[i].content = e.target.value; setPlan(newPlan);
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="max-w-7xl mx-auto animate-in fade-in duration-700">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
              <h2 className="text-2xl font-bold">生成预览</h2>
              <div className="flex flex-wrap gap-4">
                <button onClick={() => setStep('planning')} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition">调整大纲</button>
                <div className="flex gap-2">
                  <button onClick={() => handleExport('pdf')} className="px-4 py-2 text-sm bg-red-600/20 text-red-400 border border-red-600/50 rounded-lg hover:bg-red-600/30 transition">PDF</button>
                  <button onClick={() => handleExport('ppt')} className="px-4 py-2 text-sm bg-orange-600/20 text-orange-400 border border-orange-600/50 rounded-lg hover:bg-orange-600/30 transition">PPT</button>
                </div>
              </div>
            </div>
            <div className={`grid grid-cols-1 ${inputState.aspectRatio === '16:9' ? 'md:grid-cols-2 lg:grid-cols-3' : 'sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'} gap-6`}>
              {slides.map((s, i) => (
                <div key={s.id} className={`group relative rounded-xl bg-gray-800 border border-gray-700 overflow-hidden ${getAspectClass(inputState.aspectRatio)} shadow-lg hover:shadow-indigo-500/10 transition-shadow`}>
                  {s.status === 'generating' ? (
                     <div className="w-full h-full flex flex-col items-center justify-center text-gray-600 bg-gray-900/50">
                       <i className="fa-solid fa-circle-notch fa-spin text-xl text-indigo-500 mb-2"></i>
                       <span className="text-[10px] uppercase tracking-widest animate-pulse">绘制中</span>
                     </div>
                  ) : s.status === 'done' && s.base64 ? (
                     <img src={s.base64} className="w-full h-full object-cover" />
                  ) : s.status === 'error' ? (
                     <div className="w-full h-full flex flex-col items-center justify-center text-red-400 p-4 text-center text-xs">生成失败</div>
                  ) : (
                     <div className="w-full h-full flex flex-col items-center justify-center text-gray-600">
                       <i className="fa-solid fa-circle-notch fa-spin text-xl text-indigo-500 mb-2"></i>
                       <span className="text-[10px] uppercase tracking-widest animate-pulse">等待队列</span>
                     </div>
                  )}
                  
                  {s.status !== 'generating' && (
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
                      <button onClick={() => generateSingleSlide(s.id, s.prompt)} className="w-10 h-10 bg-white text-gray-900 rounded-full flex items-center justify-center shadow-lg transform hover:scale-110 transition"><i className="fa-solid fa-rotate-right"></i></button>
                      <button onClick={() => setEditingSlideId(s.id)} className="px-4 py-2 bg-white text-gray-900 rounded-full font-bold text-xs shadow-lg transform hover:scale-105 transition">查看详情</button>
                    </div>
                  )}
                  <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/50 rounded text-[10px] font-mono backdrop-blur-sm">P.{i+1}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Detail Modal */}
      {editingSlideId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-md">
           <div className="bg-gray-900 rounded-3xl w-full max-w-6xl h-[90vh] flex flex-col lg:flex-row overflow-hidden border border-gray-800 shadow-2xl relative animate-in zoom-in-95 duration-200">
              <button onClick={() => setEditingSlideId(null)} className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center bg-gray-800 rounded-full hover:bg-gray-700 transition z-20"><i className="fa-solid fa-xmark"></i></button>
              <div className="flex-1 bg-black flex items-center justify-center overflow-hidden p-4 sm:p-12">
                 {slides.find(s => s.id === editingSlideId)?.base64 && (
                   <img src={slides.find(s => s.id === editingSlideId)?.base64!} className={`max-w-full max-h-full object-contain shadow-2xl rounded-lg`} />
                 )}
              </div>
              <div className="w-full lg:w-96 bg-gray-900 border-t lg:border-t-0 lg:border-l border-gray-800 p-6 flex flex-col">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><i className="fa-solid fa-circle-info text-indigo-500"></i> 幻灯片详情</h3>
                <div className="flex-1 overflow-y-auto space-y-6 pr-2">
                  <div>
                    <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-2">标题</label>
                    <div className="text-sm font-semibold text-white bg-gray-800 p-3 rounded-xl border border-gray-700">{plan.find(p => p.id === editingSlideId)?.title}</div>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-2">核心内容</label>
                    <div className="text-xs text-gray-300 leading-relaxed bg-gray-800 p-3 rounded-xl border border-gray-700 whitespace-pre-wrap">{plan.find(p => p.id === editingSlideId)?.content}</div>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-2">画面提示词 (Prompt)</label>
                    <textarea 
                      className="w-full h-32 bg-gray-950 rounded-xl p-3 text-xs text-gray-400 border border-gray-800 focus:border-indigo-500 outline-none transition-colors resize-none"
                      value={slides.find(s => s.id === editingSlideId)?.prompt}
                      onChange={(e) => {
                        const newSlides = [...slides];
                        const idx = newSlides.findIndex(s => s.id === editingSlideId);
                        newSlides[idx].prompt = e.target.value;
                        setSlides(newSlides);
                      }}
                    />
                  </div>
                </div>
                <button 
                  onClick={() => {
                    const currentPrompt = slides.find(s => s.id === editingSlideId)!.prompt;
                    generateSingleSlide(editingSlideId, currentPrompt);
                    setEditingSlideId(null); // Return to preview grid immediately
                  }}
                  disabled={slides.find(s => s.id === editingSlideId)?.status === 'generating'}
                  className="mt-6 w-full py-4 bg-indigo-600 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-500 transition disabled:opacity-50 shadow-xl shadow-indigo-600/20"
                >
                  <i className={`fa-solid fa-rotate-right ${slides.find(s => s.id === editingSlideId)?.status === 'generating' ? 'fa-spin' : ''}`}></i> 
                  {slides.find(s => s.id === editingSlideId)?.status === 'generating' ? '正在排队...' : '更新并重新生成'}
                </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
