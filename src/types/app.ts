// 应用状态类型定义

import type { AspectRatio, ImageSize } from './slide';

export interface StyleConfig {
  id: string;
  name: string;
  prompt: string;
}

export interface DetailLevel {
  id: string;
  name: string;
  description: string;
}

export interface QualityOption {
  id: ImageSize;
  name: string;
  desc: string;
}

export interface RatioOption {
  id: AspectRatio;
  name: string;
  icon: string;
}

export interface InputConfig {
  text: string;
  slideCount: number;
  aspectRatio: AspectRatio;
  imageSize: ImageSize;
  selectedStyleId: string;
  customStylePrompt: string;
  detailLevelId: string;
}
