// 页面比例配置

import type { RatioOption } from '../types';
import type { AspectRatio } from '../types/slide';

export const RATIO_OPTIONS: RatioOption[] = [
  {
    id: '16:9',
    name: '宽屏 16:9',
    icon: 'fa-desktop'
  },
  {
    id: '4:3',
    name: '标准 4:3',
    icon: 'fa-tv'
  },
  {
    id: '1:1',
    name: '正方形 1:1',
    icon: 'fa-square'
  },
  {
    id: '3:4',
    name: '书籍 3:4',
    icon: 'fa-book-open'
  },
  {
    id: '9:16',
    name: '竖屏 9:16',
    icon: 'fa-mobile-screen'
  }
];

// 根据比例返回 Tailwind CSS 类名
export const getAspectRatioClass = (ratio: AspectRatio): string => {
  switch (ratio) {
    case '16:9':
      return 'aspect-video';
    case '4:3':
      return 'aspect-[4/3]';
    case '1:1':
      return 'aspect-square';
    case '3:4':
      return 'aspect-[3/4]';
    case '9:16':
      return 'aspect-[9/16]';
    default:
      return 'aspect-video';
  }
};
