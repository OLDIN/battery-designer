import type { Point } from '../types';

export function isPointInPolygon(target: Point, polygon: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    
    const intersect = ((yi > target.y) !== (yj > target.y))
        && (target.x < (xj - xi) * (target.y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

export function isCircleInPolygon(center: Point, radius: number, polygon: Point[]): boolean {
  // Simplification: Check if the center is inside polygon AND its distance to all lines is > radius.
  if (!isPointInPolygon(center, polygon)) return false;

  for (let i = 0; i < polygon.length; i++) {
    const p1 = polygon[i];
    const p2 = polygon[(i + 1) % polygon.length];
    const dist = distancePointToLine(center, p1, p2);
    if (dist < radius) return false;
  }
  return true;
}

function distancePointToLine(pt: Point, lineStart: Point, lineEnd: Point): number {
  const lineLenSq = Math.pow(lineEnd.x - lineStart.x, 2) + Math.pow(lineEnd.y - lineStart.y, 2);
  if (lineLenSq === 0) return Math.sqrt(Math.pow(pt.x - lineStart.x, 2) + Math.pow(pt.y - lineStart.y, 2));
  
  // Consider the line extending the segment, parameterized as lineStart + t (lineEnd - lineStart).
  // We find projection of point pt onto the line.
  let t = ((pt.x - lineStart.x) * (lineEnd.x - lineStart.x) + (pt.y - lineStart.y) * (lineEnd.y - lineStart.y)) / lineLenSq;
  t = Math.max(0, Math.min(1, t)); // clamp to [0,1] ensures we consider the line segment
  
  const projection = {
    x: lineStart.x + t * (lineEnd.x - lineStart.x),
    y: lineStart.y + t * (lineEnd.y - lineStart.y)
  };
  
  return Math.sqrt(Math.pow(pt.x - projection.x, 2) + Math.pow(pt.y - projection.y, 2));
}
