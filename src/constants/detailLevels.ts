// 内容详细度配置

import type { DetailLevel } from '../types';

export const DETAIL_LEVELS: DetailLevel[] = [
  {
    id: 'concise',
    name: '精简 (关键词)',
    description: '每页仅保留核心标题 and 极少量关键词。'
  },
  {
    id: 'moderate',
    name: '适中 (大纲)',
    description: '包含标题 and 3-5个关键点。'
  },
  {
    id: 'detailed',
    name: '详尽 (段落)',
    description: '包含较详细的解释性文本。'
  }
];
