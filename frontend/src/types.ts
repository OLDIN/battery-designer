export interface CellModel {
  id: number;
  brand: string;
  model: string;
  formFactor: string;
  capacity: number;
  maxDischarge: number;
  weight: number;
  diameter: number;
  length: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface PackConfig {
  series: number;
  parallel: number;
  useHolders: boolean;
}

export interface ImageTransform {
  scale: number;
  offsetX: number;
  offsetY: number;
}

export interface ProjectData {
  id: number;
  name: string;
}
