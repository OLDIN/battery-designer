import React, { useState, useRef, useEffect, useMemo } from 'react';
import type { Point, CellModel, PackConfig } from '../types';
import { isCircleInPolygon } from './Math';

interface WorkspaceProps {
  points: Point[];
  setPoints: React.Dispatch<React.SetStateAction<Point[]>>;
  bgImage: string | null;
  setBgImage: React.Dispatch<React.SetStateAction<string | null>>;
  selectedCell: CellModel | null;
  config: PackConfig;
  pixelsPerMm: number;
  setFittedCellsCount: React.Dispatch<React.SetStateAction<number>>;
  isCalibrating: boolean;
  setIsCalibrating: React.Dispatch<React.SetStateAction<boolean>>;
  calibrationLine: [Point, Point] | null;
  setCalibrationLine: React.Dispatch<React.SetStateAction<[Point, Point] | null>>;
}

const Workspace: React.FC<WorkspaceProps> = ({
  points, setPoints, bgImage, setBgImage, selectedCell, config,
  pixelsPerMm, setFittedCellsCount, isCalibrating, setIsCalibrating,
  calibrationLine, setCalibrationLine
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [draggingPoint, setDraggingPoint] = useState<number | null>(null);
  const [draggingCalibPoint, setDraggingCalibPoint] = useState<number | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) setBgImage(ev.target.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const startCalibrating = () => {
    setIsCalibrating(true);
    if (!calibrationLine) {
      setCalibrationLine([{x: 100, y: 100}, {x: 400, y: 100}]);
    }
  };

  const getContainerXY = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent): Point | null => {
    if (!containerRef.current) return null;
    const rect = containerRef.current.getBoundingClientRect();
    let clientX, clientY;
    
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }
    
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const handlePointerDownObject = (e: React.MouseEvent | React.TouchEvent, index: number, type: 'poly' | 'calib') => {
    e.stopPropagation();
    if (type === 'poly') setDraggingPoint(index);
    if (type === 'calib') setDraggingCalibPoint(index);
  };

  useEffect(() => {
    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      if (draggingPoint === null && draggingCalibPoint === null) return;
      const pt = getContainerXY(e);
      if (!pt) return;
      
      if (draggingPoint !== null) {
        setPoints(prev => {
          const newPoints = [...prev];
          newPoints[draggingPoint] = pt;
          return newPoints;
        });
      } else if (draggingCalibPoint !== null) {
        setCalibrationLine(prev => {
          if (!prev) return prev;
          const newLine = [...prev] as [Point, Point];
          newLine[draggingCalibPoint] = pt;
          return newLine;
        });
      }
    };
    
    const handlePointerUp = () => {
      setDraggingPoint(null);
      setDraggingCalibPoint(null);
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
    window.addEventListener('touchmove', handlePointerMove, { passive: false });
    window.addEventListener('touchend', handlePointerUp);
    
    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
    };
  }, [draggingPoint, draggingCalibPoint]);

  const addPoint = () => {
    if (points.length < 10) {
      const lastPoint = points[points.length - 1];
      setPoints([...points, { x: lastPoint.x + 50, y: lastPoint.y + 50 }]);
    }
  };

  const removePoint = (index: number) => {
    if (points.length > 3) {
      setPoints(points.filter((_, i) => i !== index));
    }
  };

  // Honeycomb calculations
  const fittedCells = useMemo(() => {
    if (!selectedCell || points.length < 3) return [];

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    points.forEach(p => {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    });

    const gapMm = config.useHolders ? 1.5 : 0.5; // holders add some space
    const cellDiameterPx = (selectedCell.diameter + gapMm) * pixelsPerMm;
    const radiusPx = (selectedCell.diameter * pixelsPerMm) / 2;
    const paddingPx = (gapMm * pixelsPerMm) / 2;
    
    const outerRadiusPx = radiusPx + paddingPx; // Space required per cell
    
    const colStep = cellDiameterPx; // Horizontal distance between centers
    const rowStep = cellDiameterPx * (Math.sqrt(3) / 2); // Vertical distance for hexagonal lattice

    const result: Point[] = [];
    
    // start slightly outside the bounds
    const startX = minX;
    const startY = minY;

    let rowIdx = 0;
    for (let y = startY; y <= maxY + rowStep; y += rowStep) {
      const xOffset = (rowIdx % 2) * (colStep / 2);
      for (let x = startX + xOffset; x <= maxX + colStep; x += colStep) {
        const center = { x, y };
        // We require the entire cell (outer radius including gaps) to fit inside polygon
        if (isCircleInPolygon(center, outerRadiusPx, points)) {
          result.push(center);
        }
      }
      rowIdx++;
    }

    return result;
  }, [points, selectedCell, config.useHolders, pixelsPerMm]);

  // Update total fitted cells to App component
  useEffect(() => {
    setFittedCellsCount(fittedCells.length);
  }, [fittedCells.length, setFittedCellsCount]);

  // Which cells are used (highlighted) vs extra (dimmed)
  const usedCount = config.series * config.parallel;
  const renderedCells = fittedCells.slice(0, usedCount).map(c => ({...c, used: true}))
    .concat(fittedCells.slice(usedCount).map(c => ({...c, used: false})));

  const polygonPath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';

  return (
    <div className="canvas-container" ref={containerRef}>
      <div className="canvas-toolbar">
        <div className="toolbar-group">
          <label className="glass-panel" style={{padding: '6px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center'}}>
            <input type="file" accept="image/*" onChange={handleImageUpload} style={{display:'none'}} />
            Upload Photo
          </label>
        </div>
        <div className="toolbar-group">
          <button className="glass-panel" onClick={startCalibrating} disabled={isCalibrating} style={{background: isCalibrating ? 'var(--accent-color)' : 'var(--panel-bg)'}}>
            Scale Rule
          </button>
          {isCalibrating && (
            <button className="glass-panel" onClick={() => setIsCalibrating(false)} style={{background: 'var(--success-color)'}}>
              Done
            </button>
          )}
          <button className="glass-panel" onClick={addPoint}>Add Node</button>
        </div>
      </div>

      {bgImage && (
        <img 
          src={bgImage} 
          alt="Bike Frame" 
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'contain', opacity: 0.6, pointerEvents: 'none' }} 
        />
      )}

      <svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0 }}>
        {/* Draw Polygon */}
        <path 
          d={polygonPath} 
          fill="rgba(59, 130, 246, 0.1)" 
          stroke="var(--accent-color)" 
          strokeWidth="2" 
        />

        {/* Draw Battery Cells */}
        {selectedCell && renderedCells.map((cell, idx) => (
          <circle
            key={idx}
            cx={cell.x}
            cy={cell.y}
            r={(selectedCell.diameter * pixelsPerMm) / 2}
            fill={cell.used ? "rgba(16, 185, 129, 0.8)" : "rgba(148, 163, 184, 0.3)"}
            stroke={cell.used ? "#059669" : "#64748b"}
            strokeWidth="1"
          />
        ))}

        {/* Draw Polygon Nodes */}
        {points.map((p, i) => (
          <g key={`poly-${i}`}>
            <circle
              cx={p.x}
              cy={p.y}
              r={6}
              fill="white"
              stroke="var(--accent-color)"
              strokeWidth="2"
              style={{ cursor: 'move' }}
              onPointerDown={(e) => handlePointerDownObject(e, i, 'poly')}
            />
            {points.length > 3 && (
              <text x={p.x + 10} y={p.y - 10} fill="red" fontSize="12" style={{cursor: 'pointer'}} onClick={(e) => {e.stopPropagation(); removePoint(i);}}>
                ×
              </text>
            )}
          </g>
        ))}

        {/* Draw Calibration Line */}
        {isCalibrating && calibrationLine && (
          <g>
            <line 
              x1={calibrationLine[0].x} 
              y1={calibrationLine[0].y} 
              x2={calibrationLine[1].x} 
              y2={calibrationLine[1].y} 
              stroke="#ef4444" 
              strokeWidth="2"
              strokeDasharray="5,5"
            />
            <circle cx={calibrationLine[0].x} cy={calibrationLine[0].y} r={8} fill="white" stroke="#ef4444" strokeWidth="2" style={{ cursor: 'move' }} onPointerDown={(e) => handlePointerDownObject(e, 0, 'calib')} />
            <circle cx={calibrationLine[1].x} cy={calibrationLine[1].y} r={8} fill="white" stroke="#ef4444" strokeWidth="2" style={{ cursor: 'move' }} onPointerDown={(e) => handlePointerDownObject(e, 1, 'calib')} />
          </g>
        )}
      </svg>
    </div>
  );
};

export default Workspace;
