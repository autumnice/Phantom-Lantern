// 视觉风格配置

import type { StyleConfig } from '../types';

export const STYLES: StyleConfig[] = [
  {
    id: 'tech_minimal',
    name: '科技极简',
    prompt: 'Minimalist tech style, dark background, neon accents, clean sans-serif typography, futuristic interface elements.',
    gradient: 'from-gray-800 to-black'
  },
  {
    id: 'corporate_blue',
    name: '商务深蓝',
    prompt: 'Professional corporate style, deep blue and white theme, structured layout, business infographics, trustworthy atmosphere.',
    gradient: 'from-blue-900 to-blue-700'
  },
  {
    id: 'creative_vibrant',
    name: '创意多彩',
    prompt: 'Vibrant and creative, bold colors, artistic shapes, playful but legible typography, modern art direction.',
    gradient: 'from-pink-500 to-yellow-500'
  },
  {
    id: 'editorial_clean',
    name: '杂志留白',
    prompt: 'High-end editorial design, ample whitespace, serif headings, elegant photography integration, sophisticated layout.',
    gradient: 'from-gray-200 to-white'
  },
  {
    id: 'hand_drawn',
    name: '手绘风格',
    prompt: 'Hand-drawn illustration style, sketchbook texture, marker font, friendly and approachable vibe, pastel colors.',
    gradient: 'from-green-200 to-teal-200'
  }
];
