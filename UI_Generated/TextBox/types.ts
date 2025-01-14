// types.ts
import { Texture } from 'three';
import { FontColor } from './constants';

export interface AskOptions {
  first: number;
  last: number;
  default: number;
}

export interface TextBoxProps {
  text: string;
  position: [number, number, number];
  width?: number;
  height?: number;
  askOptions?: AskOptions;
  fontColor?: FontColor;
  onPageComplete?: () => void;
}

export interface CharacterProps {
  charCode: number;
  position: [number, number, number];
  color: FontColor;
  fontTexture: Texture;
  scale?: number;
}

export interface IconProps {
  iconId: number;
  position: [number, number, number];
  iconTexture: Texture;
}

export interface WindowFrameProps {
  width: number;
  height: number;
  position: [number, number, number];
}