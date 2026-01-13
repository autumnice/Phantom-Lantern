import React, { useState, useEffect } from 'react';

interface FloatingShape {
  id: number;
  type: 'circle' | 'triangle' | 'square';
  size: number;
  left: string;
  top: string;
  delay: number;
  duration: number;
}

const HeroSection: React.FC = () => {
  const [shapes, setShapes] = useState<FloatingShape[]>([]);

  useEffect(() => {
    const shapeTypes: Array<'circle' | 'triangle' | 'square'> = ['circle', 'triangle', 'square'];
    const generatedShapes: FloatingShape[] = [];

    for (let i = 0; i < 15; i++) {
      generatedShapes.push({
        id: i,
        type: shapeTypes[Math.floor(Math.random() * shapeTypes.length)],
        size: Math.random() * 60 + 20,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        delay: Math.random() * 5,
        duration: Math.random() * 10 + 10
      });
    }

    setShapes(generatedShapes);
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-slate-950">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 opacity-90" />

      {/* Floating shapes container */}
      <div className="absolute inset-0 overflow-hidden">
        {shapes.map((shape) => (
          <div
            key={shape.id}
            className="absolute floating-shape"
            style={{
              left: shape.left,
              top: shape.top,
              width: `${shape.size}px`,
              height: `${shape.size}px`,
              animationDelay: `${shape.delay}s`,
              animationDuration: `${shape.duration}s`
            }}
          >
            {shape.type === 'circle' && (
              <div className="w-full h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 opacity-20 blur-sm" />
            )}
            {shape.type === 'triangle' && (
              <div
                className="w-0 h-0"
                style={{
                  borderLeft: `${shape.size/2}px solid transparent`,
                  borderRight: `${shape.size/2}px solid transparent`,
                  borderBottom: `${shape.size}px solid`,
                  borderBottomColor: 'rgba(168, 85, 247, 0.2)'
                }}
              />
            )}
            {shape.type === 'square' && (
              <div className="w-full h-full bg-gradient-to-r from-pink-400 to-purple-500 opacity-20 rotate-45 blur-sm" />
            )}
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-6xl mx-auto px-6 text-center">
        {/* Main heading with gradient text */}
        <h1 className="text-6xl md:text-8xl font-bold mb-6 leading-tight">
          <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">
            幻灯侠
          </span>
          <br />
          <span className="bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
            NanoDeck AI
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-xl md:text-2xl text-gray-300 mb-4 max-w-3xl mx-auto leading-relaxed">
          将文本瞬间转化为震撼的视觉演示
        </p>
        <p className="text-lg text-gray-400 mb-12 max-w-2xl mx-auto">
           powered by Google Gemini 3 Pro - 智能生成、精美设计、一键导出
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
          <button className="group relative px-8 py-4 text-lg font-semibold text-white rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 shadow-lg hover:shadow-cyan-500/25">
            <span className="relative z-10">开始创作</span>
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-white to-transparent opacity-0 group-hover:opacity-20 transition-opacity duration-300" />
          </button>

          <button className="group relative px-8 py-4 text-lg font-semibold text-cyan-400 rounded-full border-2 border-cyan-400 hover:bg-cyan-400 hover:text-slate-900 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1">
            了解更多
            <span className="absolute inset-0 rounded-full bg-cyan-400 opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
          </button>
        </div>

        {/* Feature tags */}
        <div className="mt-16 flex flex-wrap justify-center gap-4">
          {['AI 智能生成', '精美模板', '多格式导出', '实时预览'].map((feature, index) => (
            <div
              key={feature}
              className="px-4 py-2 rounded-full text-sm font-medium text-cyan-300 bg-cyan-400/10 border border-cyan-400/20 backdrop-blur-sm"
              style={{
                animation: `fadeInUp 0.6s ease-out ${0.8 + index * 0.1}s both`
              }}
            >
              {feature}
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
          }
          33% {
            transform: translateY(-30px) rotate(120deg);
          }
          66% {
            transform: translateY(30px) rotate(240deg);
          }
        }

        .floating-shape {
          animation: float ease-in-out infinite;
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Add subtle pulse animation to gradient background */
        section::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3), transparent 50%),
                      radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.15), transparent 50%);
          animation: pulse 8s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 0.5;
          }
          50% {
            opacity: 0.8;
          }
        }
      `}</style>
    </section>
  );
};

export default HeroSection;
