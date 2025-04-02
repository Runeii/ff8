export type FontColor = 'red' | 'green' | 'blue' | 'yellow' | 'magenta' | 'gray' | 'shadow' | 'white';

export type Placement = {
  rowIndex: number;
  columnIndex: number;
  x: number;
  y: number;
}

export type Modifier = {
  type: 'color'
  color?: FontColor;
} | {
  type: 'wait';
  duration: number;
} | {
  type: 'general';
}