import type { Point, CellModel, PackConfig } from '../types';
import { isCircleInPolygon } from '../components/Math';

export function getFittedCells(
  points: Point[],
  selectedCell: CellModel | null,
  config: PackConfig
): Point[] {
  if (!selectedCell || points.length < 3) return [];

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  points.forEach(p => {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  });

  const gapMm = config.useHolders ? 1.5 : 0.5;
  const cellDiameter = selectedCell.diameter + gapMm;
  const radius = selectedCell.diameter / 2;
  const padding = (gapMm / 2) + config.caseThickness;
  const outerRadius = radius + padding;
  
  const colStep = cellDiameter;
  const rowStep = cellDiameter * (Math.sqrt(3) / 2);

  const result: Point[] = [];
  let rowIdx = 0;
  for (let y = minY; y <= maxY + rowStep; y += rowStep) {
    const xOffset = (rowIdx % 2) * (colStep / 2);
    for (let x = minX + xOffset; x <= maxX + colStep; x += colStep) {
      const center = { x, y };
      if (isCircleInPolygon(center, outerRadius, points)) {
        result.push(center);
      }
    }
    rowIdx++;
  }
  return result;
}
