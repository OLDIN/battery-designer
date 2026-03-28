import React, { useState, useRef, useEffect, useMemo } from 'react';
import type { Point, CellModel, PackConfig, ImageTransform } from '../types';
import { isCircleInPolygon } from './Math';

interface WorkspaceProps {
  points: Point[];
  setPoints: React.Dispatch<React.SetStateAction<Point[]>>;
  bgImage: string | null;
  setBgImage: React.Dispatch<React.SetStateAction<string | null>>;
  selectedCell: CellModel | null;
  config: PackConfig;
  setFittedCellsCount: React.Dispatch<React.SetStateAction<number>>;
  imageTransform: ImageTransform;
  setImageTransform: React.Dispatch<React.SetStateAction<ImageTransform>>;
}

const Workspace: React.FC<WorkspaceProps> = ({
  points, setPoints, bgImage, setBgImage, selectedCell, config,
  setFittedCellsCount, imageTransform, setImageTransform
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Interaction states
  const [draggingPoint, setDraggingPoint] = useState<number | null>(null);
  const [isPanningImg, setIsPanningImg] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<Point | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) setBgImage(ev.target.result as string);
        setImageTransform({ scale: 1, offsetX: 0, offsetY: 0 }); // reset transform on new image
      };
      reader.readAsDataURL(file);
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

  // Dragging event listeners
  useEffect(() => {
    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      const pt = getContainerXY(e);
      if (!pt) return;
      
      if (draggingPoint !== null) {
        setPoints(prev => {
          const newPoints = [...prev];
          newPoints[draggingPoint] = pt;
          return newPoints;
        });
      } else if (isPanningImg && panStart) {
        // Calculate offset delta
        const dx = pt.x - panStart.x;
        const dy = pt.y - panStart.y;
        setImageTransform(prev => ({
          ...prev,
          offsetX: prev.offsetX + dx,
          offsetY: prev.offsetY + dy
        }));
        setPanStart(pt); // update start to current
      }
    };
    
    const handlePointerUp = () => {
      setDraggingPoint(null);
      setIsPanningImg(false);
      setPanStart(null);
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
  }, [draggingPoint, isPanningImg, panStart, setPoints, setImageTransform]);

  const handleWheel = (e: React.WheelEvent) => {
    if (!bgImage) return;
    
    // Zoom the image
    const zoomSensitivity = 0.001;
    const delta = -e.deltaY * zoomSensitivity;
    
    setImageTransform(prev => {
      const newScale = Math.max(0.1, prev.scale * (1 + delta));
      return { ...prev, scale: newScale };
    });
  };

  const handleContainerPointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    // If we click on the empty canvas and not on a node, start panning the image (if loaded)
    const pt = getContainerXY(e);
    if (bgImage && pt) {
      setIsPanningImg(true);
      setPanStart(pt);
    }
  };

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

  // Honeycomb calculations mathematically exact
  // SVG 1 unit = 1 millimeter logically
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
    
    // Exact absolute measurements
    const cellDiameter = selectedCell.diameter + gapMm;
    const radius = selectedCell.diameter / 2;
    const padding = gapMm / 2;
    const outerRadius = radius + padding; // Space required per cell
    
    const colStep = cellDiameter; // Horizontal distance between centers
    const rowStep = cellDiameter * (Math.sqrt(3) / 2); // Vertical distance for hexagonal lattice

    const result: Point[] = [];
    const startX = minX;
    const startY = minY;

    let rowIdx = 0;
    for (let y = startY; y <= maxY + rowStep; y += rowStep) {
      const xOffset = (rowIdx % 2) * (colStep / 2);
      for (let x = startX + xOffset; x <= maxX + colStep; x += colStep) {
        const center = { x, y };
        // We require the entire cell (outer radius including gaps) to fit inside polygon
        if (isCircleInPolygon(center, outerRadius, points)) {
          result.push(center);
        }
      }
      rowIdx++;
    }

    return result;
  }, [points, selectedCell, config.useHolders]);

  useEffect(() => {
    setFittedCellsCount(fittedCells.length);
  }, [fittedCells.length, setFittedCellsCount]);

  const usedCount = config.series * config.parallel;
  const renderedCells = fittedCells.slice(0, usedCount).map(c => ({...c, used: true}))
    .concat(fittedCells.slice(usedCount).map(c => ({...c, used: false})));

  const polygonPath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';

  return (
    <div className="canvas-container" ref={containerRef} onWheel={handleWheel} onPointerDown={handleContainerPointerDown} style={{cursor: isPanningImg ? 'grabbing' : 'default'}}>
      <div className="canvas-toolbar">
        <div className="toolbar-group">
          <label className="glass-panel" style={{padding: '6px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center'}}>
            <input type="file" accept="image/*" onChange={handleImageUpload} style={{display:'none'}} />
            Upload Photo
          </label>
        </div>
        <div className="toolbar-group">
          <div className="glass-panel" style={{padding: '6px 12px', opacity: 0.8, fontSize: '12px'}}>
            Scroll to Zoom image. Drag to Pan image.
          </div>
          <button className="glass-panel" onClick={addPoint}>Add Node</button>
        </div>
      </div>

      <svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0 }}>
        {/* Draw Ruler Grid Pattern: 10mm small, 100mm large */}
        <defs>
          <pattern id="smallGrid" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
          </pattern>
          <pattern id="grid" width="100" height="100" patternUnits="userSpaceOnUse">
            <rect width="100" height="100" fill="url(#smallGrid)" />
            <path d="M 100 0 L 0 0 0 100" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
          </pattern>
        </defs>
        
        {/* Grid Background */}
        <rect width="100%" height="100%" fill="url(#grid)" pointerEvents="none" />

        {/* Scaled & Translated Background Image */}
        {bgImage && (
          <image 
            href={bgImage} 
            x="0" 
            y="0" 
            opacity="0.6"
            transform={`translate(${imageTransform.offsetX}, ${imageTransform.offsetY}) scale(${imageTransform.scale})`}
            pointerEvents="none"
          />
        )}

        {/* Draw Polygon Frame */}
        <path 
          d={polygonPath} 
          fill="rgba(59, 130, 246, 0.1)" 
          stroke="var(--accent-color)" 
          strokeWidth="2" 
          pointerEvents="none"
        />

        {/* Draw Battery Cells */}
        {selectedCell && renderedCells.map((cell, idx) => (
          <circle
            key={idx}
            cx={cell.x}
            cy={cell.y}
            r={selectedCell.diameter / 2}
            fill={cell.used ? "rgba(16, 185, 129, 0.8)" : "rgba(148, 163, 184, 0.3)"}
            stroke={cell.used ? "#059669" : "#64748b"}
            strokeWidth="1"
            pointerEvents="none"
          />
        ))}

        {/* Draw Polygon Edge Labels (Lengths in mm) */}
        {points.map((p1, i) => {
          const p2 = points[(i + 1) % points.length];
          const dist = Math.round(Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2)));
          const midX = (p1.x + p2.x) / 2;
          const midY = (p1.y + p2.y) / 2;
          return (
            <g key={`edge-${i}`} pointerEvents="none">
              <rect 
                x={midX - 25} 
                y={midY - 10} 
                width="50" 
                height="20" 
                fill="rgba(30,30,40,0.8)" 
                stroke="var(--accent-color)" 
                strokeWidth="1" 
                rx="4"
              />
              <text 
                x={midX} 
                y={midY + 4} 
                fill="white" 
                fontSize="11" 
                textAnchor="middle"
              >
                {dist} mm
              </text>
            </g>
          );
        })}

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
              onPointerDown={(e) => {
                e.stopPropagation(); // prevent panning image
                setDraggingPoint(i);
              }}
            />
            {points.length > 3 && (
              <text x={p.x + 10} y={p.y - 10} fill="red" fontSize="12" style={{cursor: 'pointer'}} onClick={(e) => {e.stopPropagation(); removePoint(i);}}>
                ×
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
};

export default Workspace;
