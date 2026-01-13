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
  status: 'pending' | 'generating' | 'done' | 'error' | 'retrying';
  prompt: string;
  retryCount?: number;
  errorMsg?: string;
}

type AspectRatio = '16:9' | '4:3' | '1:1' | '3:4' | '9:16';
type ImageSize = '1K' | '2K' | '4K';
type AppStep = 'input' | 'planning' | 'generating' | 'preview';
type ThemeMode = 'light' | 'dark' | 'system';

// --- Constants ---

const STYLES = [
  { id: 'tech_minimal', name: '科技极简', prompt: 'Minimalist tech style, dark background, neon accents, clean sans-serif typography, futuristic interface elements.' },
  { id: 'corporate_blue', name: '商务深蓝', prompt: 'Professional corporate style, deep blue and white theme, structured layout, business infographics, trustworthy atmosphere.' },
  { id: 'creative_vibrant', name: '创意多彩', prompt: 'Vibrant and creative, bold colors, artistic shapes, playful but legible typography, modern art direction.' },
  { id: 'editorial_clean', name: '杂志留白', prompt: 'High-end editorial design, ample whitespace, serif headings, elegant photography integration, sophisticated layout.' },
  { id: 'hand_drawn', name: '手绘风格', prompt: 'Hand-drawn illustration style, sketchbook texture, marker font, friendly and approachable vibe, pastel colors.' },
];

const DETAIL_LEVELS = [
  { id: 'concise', name: '精简 (关键词)', description: '每页仅保留核心标题 and 极少量关键词。' },
  { id: 'moderate', name: '适中 (大纲)', description: '包含标题 and 3-5个关键点。' },
  { id: 'detailed', name: '详尽 (段落)', description: '包含较详细的解释性文本。' },
];

const QUALITY_OPTIONS: { id: ImageSize; name: string; desc: string }[] = [
  { id: '1K', name: '1K 标准', desc: '快速生成，适合草稿' },
  { id: '2K', name: '2K 高清', desc: '细节丰富，适合演示' },
  { id: '4K', name: '4K 极致', desc: '超清像素，专业画质' },
];

const RATIO_OPTIONS: { id: AspectRatio; name: string; icon: string }[] = [
  { id: '16:9', name: '宽屏 16:9', icon: 'fa-desktop' },
  { id: '4:3', name: '标准 4:3', icon: 'fa-tv' },
  { id: '1:1', name: '正方形 1:1', icon: 'fa-square' },
  { id: '3:4', name: '书籍 3:4', icon: 'fa-book-open' },
  { id: '9:16', name: '竖屏 9:16', icon: 'fa-mobile-screen' },
];

// --- Helper Functions ---

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- Components ---

const Header = () => {
  const { effectiveTheme } = useTheme();

  return (
    <header className={`flex items-center justify-between px-6 py-4 border-b ${effectiveTheme === 'dark' ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center">
          <i className="fa-solid fa-bolt text-gray-900 text-lg"></i>
        </div>
        <h1 className={`text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r ${effectiveTheme === 'dark' ? 'from-white to-gray-400' : 'from-gray-900 to-gray-600'}`}>
          NanoDeck AI
        </h1>
      </div>
      <div className="flex items-center gap-4">
        <ThemeToggle />
        <div className={`text-sm ${effectiveTheme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>Powered by Gemini 3 Pro</div>
      </div>
    </header>
  );
};

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

        <div className="col-span-1 md:col-span-2">
          <label className="block text-gray-400 text-sm font-medium mb-2">生成画质 (4K 生成极慢且易过载)</label>
          <div className="grid grid-cols-3 gap-2 bg-gray-900 rounded-lg border border-gray-700 p-1">
            {QUALITY_OPTIONS.map((q) => (
              <button
                key={q.id}
                onClick={() => setState({ ...state, imageSize: q.id })}
                className={`flex flex-col items-center justify-center gap-0.5 py-2 rounded-md transition-all border ${
                  state.imageSize === q.id 
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

// --- Theme Context ---

interface ThemeContextType {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  effectiveTheme: 'light' | 'dark';
}

const ThemeContext = React.createContext<ThemeContextType | undefined>(undefined);

const useTheme = () => {
  const context = React.useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('theme') as ThemeMode;
    return saved || 'system';
  });

  const effectiveTheme: 'light' | 'dark' = React.useMemo(() => {
    if (theme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return theme;
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('theme', theme);
    document.documentElement.setAttribute('data-theme', effectiveTheme);
  }, [theme, effectiveTheme]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      if (theme === 'system') {
        document.documentElement.setAttribute('data-theme', mediaQuery.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, effectiveTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

const ThemeToggle = () => {
  const { theme, setTheme, effectiveTheme } = useTheme();

  const cycleTheme = () => {
    const themes: ThemeMode[] = ['light', 'dark', 'system'];
    const currentIndex = themes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  const getThemeIcon = () => {
    switch (theme) {
      case 'light': return 'fa-sun';
      case 'dark': return 'fa-moon';
      case 'system': return 'fa-gear';
    }
  };

  const getThemeLabel = () => {
    switch (theme) {
      case 'light': return '浅色模式';
      case 'dark': return '深色模式';
      case 'system': return '跟随系统';
    }
  };

  return (
    <button
      onClick={cycleTheme}
      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 hover:bg-gray-700 transition-colors"
      title={`当前: ${getThemeLabel()}`}
    >
      <i className={`fa-solid ${getThemeIcon()} text-yellow-400`}></i>
      <span className="text-sm text-gray-300">{getThemeLabel()}</span>
    </button>
  );
};

// --- Main App ---

const App = () => {
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [step, setStep] = useState<AppStep>('input');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  
  // Ref to track the current slides state for internal logic
  const slidesRef = useRef<SlideImage[]>([]);
  // Generation version used to cancel background tasks if user switches steps or returns home
  const generationVersion = useRef(0);

  // Persistent Input State
  const [inputState, setInputState] = useState({
    text: '',
    slideCount: 5,
    aspectRatio: '16:9' as AspectRatio,
    imageSize: '1K' as ImageSize,
    selectedStyleId: STYLES[0].id,
    customStylePrompt: '',
    detailLevelId: DETAIL_LEVELS[1].id
  });

  const [plan, setPlan] = useState<SlidePlan[]>([]);
  const [slides, setSlides] = useState<SlideImage[]>([]);
  const [editingSlideId, setEditingSlideId] = useState<number | null>(null);
  const [tempImageSize, setTempImageSize] = useState<ImageSize>('1K');

  useEffect(() => {
    slidesRef.current = slides;
  }, [slides]);

  useEffect(() => {
    const check = async () => {
      if ((window as any).aistudio?.hasSelectedApiKey) {
        setHasKey(await (window as any).aistudio.hasSelectedApiKey());
      } else setHasKey(true);
    };
    check();
  }, []);

  const handleReturnHome = () => {
    setShowResetConfirm(true);
  };

  const confirmReset = () => {
    generationVersion.current++; // Stop all pending background generation tasks
    setPlan([]);
    setSlides([]);
    slidesRef.current = []; // Critical sync: Immediately clear ref so logic sees empty state
    setStep('input');
    setIsLoading(false);
    setShowResetConfirm(false);
  };

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
        alert("所选 API 密钥的项目未启用计费，请重新选择以使用 Pro 模型。");
      } else {
        alert("大纲规划失败。请检查内容或重试。");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartGeneration = async () => {
    generationVersion.current++; // Increment version to clear any stale retry loops
    const currentVer = generationVersion.current;

    setStep('generating');
    const styleObj = inputState.selectedStyleId === 'custom' 
      ? { name: '自定义', prompt: inputState.customStylePrompt }
      : STYLES.find(s => s.id === inputState.selectedStyleId);

    const initialSlides: SlideImage[] = plan.map(p => ({
      id: p.id,
      base64: null,
      status: 'pending',
      prompt: `High quality professional ${inputState.aspectRatio} presentation slide design. 
               Title: "${p.title}" (rendered in elegant Chinese). 
               Body: "${p.content}" (rendered in legible Chinese). 
               Style Theme: ${styleObj?.prompt}. 
               Imagery: ${p.visualDescription}. 
               Ensure cinematic lighting, high resolution details, and a clean professional layout.`
    }));
    
    // Critical sync: Explicitly update ref immediately before loop starts.
    // This prevents the loop from seeing stale 'done' states from previous runs (if IDs overlap)
    // which would cause it to skip generation.
    setSlides(initialSlides);
    slidesRef.current = initialSlides; 
    setStep('preview');
    
    // Process sequentially
    for (let i = 0; i < initialSlides.length; i++) {
      if (currentVer !== generationVersion.current) return; // Stop if version changed

      const targetId = initialSlides[i].id;
      
      // Check current status using the ref (which we just synced)
      const currentSlideStatus = slidesRef.current.find(s => s.id === targetId)?.status;
      if (currentSlideStatus === 'done' || currentSlideStatus === 'generating' || currentSlideStatus === 'retrying') {
        continue;
      }

      await generateSingleSlide(targetId, initialSlides[i].prompt, 0, false, currentVer);
      
      // Cooldown between requests
      const cooldown = inputState.imageSize === '4K' ? 10000 : 4000;
      if (i < initialSlides.length - 1 && currentVer === generationVersion.current) {
        await sleep(cooldown); 
      }
    }
  };

  /**
   * Refactored: Logical generation function with version check and concurrency prevention
   */
  const generateSingleSlide = async (
    id: number, 
    prompt: string, 
    retryCount = 0, 
    isManual = false, 
    version: number,
    specificImageSize?: ImageSize
  ) => {
    // 1. Version Check: If this task belongs to an old session/version, abort.
    if (version !== generationVersion.current) return false;

    // 2. State Guard for automatic loop: If already busy, don't overlap
    // FIX: Only check guard if it's the INITIAL attempt (retryCount === 0). 
    // If we are retrying (retryCount > 0), we are the active process for this ID, so we should proceed.
    const current = slidesRef.current.find(s => s.id === id);
    if (retryCount === 0 && !isManual && (current?.status === 'generating' || current?.status === 'retrying' || current?.status === 'done')) {
      return false;
    }

    // REDUCED RETRY COUNT: 2 retries = 3 total attempts
    const MAX_RETRIES = 2;
    
    // 3. Set Status Atomically
    setSlides(prev => prev.map(s => s.id === id ? { 
      ...s, 
      status: retryCount > 0 ? 'retrying' : 'generating',
      retryCount,
      errorMsg: undefined,
      // Clear base64 only if it's the very first manual re-trigger
      base64: (isManual && retryCount === 0) ? null : s.base64 
    } : s));
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const resp = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: { parts: [{ text: prompt }] },
        config: { 
          imageConfig: { 
            aspectRatio: inputState.aspectRatio,
            // Use specific size if provided (e.g. via edit modal), otherwise default to global config
            imageSize: specificImageSize ?? inputState.imageSize 
          }
        }
      });
      
      if (version !== generationVersion.current) return false;

      let base64 = null;
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
        return true; 
      } else {
        throw new Error("No image data returned.");
      }
    } catch (e: any) {
      if (version !== generationVersion.current) return false;
      console.error(`Slide ${id} Error (Attempt ${retryCount}):`, e);
      
      const errorStr = JSON.stringify(e);
      const isOverloaded = errorStr.includes("503") || errorStr.includes("overloaded") || errorStr.includes("UNAVAILABLE");
      
      if (e.message?.includes("Requested entity was not found")) {
        setHasKey(false);
        setSlides(prev => prev.map(s => s.id === id ? { ...s, status: 'error', errorMsg: "API权限不足/计费未开启" } : s));
        return false;
      }

      // 4. Optimized Retry Logic with Capped Backoff
      if (isOverloaded && retryCount < MAX_RETRIES) {
        // Growth: 4s, 8s, 16s, cap at 25s
        const baseMs = (Math.pow(2, retryCount) * 4000);
        const jitter = Math.random() * 2000;
        const backoffMs = Math.min(baseMs + jitter, 25000);
        
        setSlides(prev => prev.map(s => s.id === id ? { 
          ...s, 
          status: 'retrying', 
          errorMsg: `服务器繁忙，${Math.round(backoffMs/1000)}s 后重试...` 
        } : s));
        
        await sleep(backoffMs);
        if (version !== generationVersion.current) return false;
        // Pass specificImageSize along to the retry
        return await generateSingleSlide(id, prompt, retryCount + 1, isManual, version, specificImageSize);
      }
      
      // 5. Terminal failure
      setSlides(prev => prev.map(s => s.id === id ? { 
        ...s, 
        status: 'error', 
        errorMsg: isOverloaded ? "服务器过载，请尝试手动重试或降低画质" : "生成失败，可能是内容受限或API错误" 
      } : s));
      return false;
    }
  };

  const handleManualRegenerate = (id: number, prompt: string, size?: ImageSize) => {
    // Clicking regenerate should NOT increment the global version, 
    // but it SHOULD use the current version to ensure it stops if the user leaves the page.
    generateSingleSlide(id, prompt, 0, true, generationVersion.current, size);
  };

  const handleExport = (type: 'pdf' | 'ppt') => {
    const ratio = inputState.aspectRatio;
    const slidesData = slidesRef.current;
    
    if (type === 'ppt') {
      const pptx = new (window as any).PptxGenJS();
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
      
      slidesData.forEach(s => {
        if (s.base64) {
          const slide = pptx.addSlide();
          slide.background = { data: s.base64 };
        }
      });
      pptx.writeFile({ fileName: `NanoDeck-${Date.now()}.pptx` });
    } else {
      const { jsPDF } = (window as any).jspdf;
      let width = 1920, height = 1080, orientation: 'p' | 'l' = 'l';
      
      if (ratio === '16:9') { width = 1920; height = 1080; orientation = 'l'; }
      else if (ratio === '4:3') { width = 1440; height = 1080; orientation = 'l'; }
      else if (ratio === '1:1') { width = 1440; height = 1440; orientation = 'p'; }
      else if (ratio === '3:4') { width = 1080; height = 1440; orientation = 'p'; }
      else if (ratio === '9:16') { width = 1080; height = 1920; orientation = 'p'; }
      
      const doc = new jsPDF({ orientation, unit: 'px', format: [width, height] });
      slidesData.forEach((s, i) => {
        if (s.base64) {
          if (i > 0) doc.addPage([width, height], orientation);
          doc.addImage(s.base64, 'PNG', 0, 0, width, height);
        }
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
      <h2 className="text-2xl font-bold mb-4">需要连接付费 API 密钥</h2>
      <p className="text-gray-400 mb-8 max-w-sm">4K 图像生成和 Pro 模型需要使用开启了计费功能的 GCP 项目 API 密钥。</p>
      <button onClick={() => (window as any).aistudio.openSelectKey().then(() => setHasKey(true))} className="px-8 py-3 bg-indigo-600 rounded-xl font-bold shadow-lg transition hover:bg-indigo-500">连接密钥</button>
      <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="mt-4 text-xs text-indigo-400 hover:underline">了解计费文档</a>
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
                <button onClick={handleStartGeneration} className="px-4 sm:px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-lg shadow-lg transition">开始绘图 ({inputState.imageSize})</button>
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
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 bg-gray-900/50 p-6 rounded-2xl border border-gray-800">
              <div>
                <h2 className="text-2xl font-bold">生成预览</h2>
                <div className="flex items-center gap-2 mt-1">
                   <p className="text-sm text-gray-500">图片生成任务已安排。并发较多时可能需要稍等片刻。</p>
                   <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 text-[10px] rounded border border-indigo-500/20 font-bold">{inputState.imageSize} 品质</span>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex bg-gray-800 p-1 rounded-xl border border-gray-700">
                  <button onClick={handleReturnHome} className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition flex items-center gap-2">
                    <i className="fa-solid fa-house"></i> 首页
                  </button>
                  <button onClick={() => setStep('planning')} className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition flex items-center gap-2 border-l border-gray-700">
                    <i className="fa-solid fa-arrow-left"></i> 修改大纲
                  </button>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleExport('pdf')} className="px-4 py-2 text-sm bg-red-600/20 text-red-400 border border-red-600/50 rounded-xl hover:bg-red-600/30 transition flex items-center gap-2">
                    <i className="fa-solid fa-file-pdf"></i> PDF
                  </button>
                  <button onClick={() => handleExport('ppt')} className="px-4 py-2 text-sm bg-orange-600/20 text-orange-400 border border-orange-600/50 rounded-xl hover:bg-orange-600/30 transition flex items-center gap-2">
                    <i className="fa-solid fa-file-powerpoint"></i> PPTX
                  </button>
                </div>
              </div>
            </div>

            <div className={`grid grid-cols-1 ${inputState.aspectRatio === '16:9' ? 'md:grid-cols-2 lg:grid-cols-3' : 'sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'} gap-6 mb-12`}>
              {slides.map((s, i) => (
                <div key={s.id} className={`group relative rounded-xl bg-gray-800 border border-gray-700 overflow-hidden ${getAspectClass(inputState.aspectRatio)} shadow-lg hover:shadow-indigo-500/10 transition-shadow`}>
                  {s.status === 'generating' || s.status === 'retrying' ? (
                     <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gray-900/50 p-4 text-center">
                       <i className="fa-solid fa-circle-notch fa-spin text-xl text-indigo-500 mb-2"></i>
                       <span className="text-[10px] uppercase tracking-widest animate-pulse">
                         {s.status === 'retrying' ? '重试队列中...' : (inputState.imageSize === '4K' ? '超清渲染中...' : '绘制中...')}
                       </span>
                       {s.errorMsg && <p className="text-[9px] mt-2 text-gray-400 leading-tight bg-gray-900/80 px-2 py-1 rounded border border-gray-700">{s.errorMsg}</p>}
                     </div>
                  ) : s.status === 'done' && s.base64 ? (
                     <div className="relative w-full h-full">
                        <img src={s.base64} className="w-full h-full object-cover animate-in fade-in duration-500" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 backdrop-blur-sm">
                          <button 
                            onClick={() => {
                              setEditingSlideId(s.id);
                              setTempImageSize(inputState.imageSize);
                            }}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-xs transform scale-90 group-hover:scale-100 transition-all shadow-lg"
                          >
                            <i className="fa-solid fa-pen-to-square mr-2"></i>编辑 / 重绘
                          </button>
                          <button 
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href = s.base64!;
                              link.download = `slide-${s.id}.png`;
                              link.click();
                            }}
                            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-bold text-xs transform scale-90 group-hover:scale-100 transition-all backdrop-blur-md"
                          >
                            <i className="fa-solid fa-download mr-2"></i>保存图片
                          </button>
                        </div>
                     </div>
                  ) : s.status === 'error' ? (
                     <div className="w-full h-full flex flex-col items-center justify-center text-red-400 p-4 text-center bg-gray-900/50">
                        <i className="fa-solid fa-triangle-exclamation mb-2 text-xl"></i>
                        <span className="text-[10px] line-clamp-3 mt-1 mb-3">{s.errorMsg || '生成失败'}</span>
                        <button 
                          onClick={() => {
                            setEditingSlideId(s.id);
                            setTempImageSize(inputState.imageSize);
                          }}
                          className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-xs transition flex items-center gap-1"
                        >
                          <i className="fa-solid fa-rotate-right"></i> 编辑并重试
                        </button>
                     </div>
                  ) : null}

                  <div className="absolute top-2 left-2 px-2 py-1 bg-black/50 backdrop-blur-sm rounded text-[10px] font-mono text-white/50 pointer-events-none">
                    #{s.id}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-center mt-12 mb-8">
               <button 
                 onClick={handleReturnHome}
                 className="group px-6 py-3 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded-full font-bold transition-all shadow-lg flex items-center gap-2 border border-gray-700 hover:border-gray-500"
               >
                  <i className="fa-solid fa-arrow-left group-hover:-translate-x-1 transition-transform"></i>
                  返回首页
               </button>
            </div>
          </div>
        )}
      </main>

      {/* Edit Modal */}
      {editingSlideId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
           {(() => {
              const slide = slides.find(s => s.id === editingSlideId);
              if (!slide) return null;
              return (
                 <div className="bg-gray-900 w-full max-w-2xl rounded-2xl border border-gray-800 shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
                    <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-900/50 rounded-t-2xl">
                       <h3 className="font-bold text-white flex items-center gap-2">
                         <span className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs">#{slide.id}</span>
                         编辑幻灯片
                       </h3>
                       <button onClick={() => setEditingSlideId(null)} className="text-gray-400 hover:text-white w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-800 transition">
                          <i className="fa-solid fa-xmark text-lg"></i>
                       </button>
                    </div>
                    
                    <div className="p-6 overflow-y-auto space-y-6">
                       <div className={`mx-auto ${getAspectClass(inputState.aspectRatio)} max-h-[40vh] bg-gray-950 rounded-lg overflow-hidden border border-gray-800 flex items-center justify-center relative shadow-inner`}>
                          {slide.base64 ? (
                             <img src={slide.base64} className="w-full h-full object-contain" />
                          ) : (
                             <div className="text-gray-600 flex flex-col items-center gap-2">
                               <i className="fa-solid fa-image text-2xl opacity-50"></i>
                               <span className="text-xs">暂无图片预览</span>
                             </div>
                          )}
                       </div>
                       
                       <div>
                          <label className="flex items-center justify-between text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">
                            <span>提示词 (Prompt)</span>
                            <span className="text-[10px] bg-gray-800 px-2 py-0.5 rounded text-gray-400">English Only</span>
                          </label>
                          <textarea 
                             className="w-full h-24 bg-gray-950 border border-gray-800 rounded-xl p-4 text-sm text-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none resize-none transition-all font-mono leading-relaxed"
                             value={slide.prompt}
                             onChange={(e) => {
                                const newPrompt = e.target.value;
                                setSlides(prev => prev.map(s => s.id === slide.id ? { ...s, prompt: newPrompt } : s));
                             }}
                             placeholder="输入图像生成提示词..."
                          />
                       </div>
                       
                       <div>
                          <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">重绘画质</label>
                          <div className="flex gap-2">
                             {QUALITY_OPTIONS.map(q => (
                                <button
                                   key={q.id}
                                   onClick={() => setTempImageSize(q.id)}
                                   className={`px-4 py-2 rounded-lg text-xs font-medium transition-all border ${
                                      tempImageSize === q.id 
                                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-900/20' 
                                        : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-750 hover:text-gray-300'
                                   }`}
                                >
                                   {q.name}
                                </button>
                             ))}
                          </div>
                       </div>
                    </div>
                    
                    <div className="p-4 border-t border-gray-800 flex justify-end gap-3 bg-gray-900/50 rounded-b-2xl">
                       <button onClick={() => setEditingSlideId(null)} className="px-5 py-2.5 text-sm font-medium text-gray-400 hover:text-white transition">取消</button>
                       <button 
                          onClick={() => {
                             handleManualRegenerate(slide.id, slide.prompt, tempImageSize);
                             setEditingSlideId(null);
                          }}
                          className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-900/30 flex items-center gap-2 transform active:scale-95 transition-all"
                       >
                          <i className="fa-solid fa-wand-magic-sparkles"></i> 立即重绘
                       </button>
                    </div>
                 </div>
              );
           })()}
        </div>
      )}

      {/* Reset Confirmation Modal - Fixes the issue */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-[100] bg-gray-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
           <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 max-w-sm w-full shadow-2xl transform scale-100 ring-1 ring-white/10">
             <div className="text-center">
               <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                 <i className="fa-solid fa-house-chimney text-3xl text-yellow-500"></i>
               </div>
               <h3 className="text-xl font-bold text-white mb-3">返回首页？</h3>
               <p className="text-gray-400 text-sm leading-relaxed mb-8">
                 确定要返回首页吗？<br/>
                 <span className="text-red-400">当前生成的演示文稿将会丢失</span>，且无法恢复。建议先导出文件。
               </p>
               <div className="grid grid-cols-2 gap-4">
                 <button 
                   onClick={() => setShowResetConfirm(false)}
                   className="px-4 py-3 rounded-xl font-bold bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white transition border border-gray-700"
                 >
                   取消
                 </button>
                 <button 
                   onClick={confirmReset}
                   className="px-4 py-3 rounded-xl font-bold bg-gradient-to-r from-red-600 to-red-500 text-white hover:from-red-500 hover:to-red-400 shadow-lg shadow-red-900/20 transition"
                 >
                   确认返回
                 </button>
               </div>
             </div>
           </div>
        </div>
      )}
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(
  <ThemeProvider>
    <App />
  </ThemeProvider>
);
