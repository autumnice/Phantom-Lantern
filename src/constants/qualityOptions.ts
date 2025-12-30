// 图片质量选项配置

import type { QualityOption } from '../types';
import type { ImageSize } from '../types/slide';

export const QUALITY_OPTIONS: QualityOption[] = [
  {
    id: '1K',
    name: '1K 标准',
    desc: '快速生成，适合草稿'
  },
  {
    id: '2K',
    name: '2K 高清',
    desc: '细节丰富，适合演示'
  },
  {
    id: '4K',
    name: '4K 极致',
    desc: '超清像素，专业画质'
  }
];
