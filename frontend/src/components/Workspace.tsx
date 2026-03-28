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
  isSidebarOpen: boolean;
  setIsSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const Workspace: React.FC<WorkspaceProps> = ({
  points, setPoints, bgImage, setBgImage, selectedCell, config,
  setFittedCellsCount, imageTransform, setImageTransform,
  isSidebarOpen, setIsSidebarOpen
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Interaction states
  const [draggingPoint, setDraggingPoint] = useState<number | null>(null);
  
  // Panning/Zooming Modes
  const [isPhotoLocked, setIsPhotoLocked] = useState<boolean>(true);
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [isDraggingPolygon, setIsDraggingPolygon] = useState<boolean>(false);
  const [panStartClient, setPanStartClient] = useState<Point | null>(null);

  const [camera, setCamera] = useState({ x: 0, y: 0, scale: 1 });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) setBgImage(ev.target.result as string);
        setImageTransform({ scale: 1, offsetX: 0, offsetY: 0 }); // reset transform on new image
        setCamera({ x: 0, y: 0, scale: 1 }); // reset camera
        setIsPhotoLocked(false); // Default to unlock on new upload so they can trim it
      };
      reader.readAsDataURL(file);
    }
  };

  const getClientPt = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent): Point | null => {
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

  const getLogicalPt = (clientPt: Point): Point => {
    return {
      x: (clientPt.x - camera.x) / camera.scale,
      y: (clientPt.y - camera.y) / camera.scale
    };
  };

  // Dragging event listeners
  useEffect(() => {
    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      const clientPt = getClientPt(e);
      if (!clientPt) return;
      
      if (draggingPoint !== null) {
        const logicalPt = getLogicalPt(clientPt);
        setPoints(prev => {
          const newPoints = [...prev];
          newPoints[draggingPoint] = logicalPt;
          return newPoints;
        });
      } else if (isDraggingPolygon && panStartClient) {
        const dx = clientPt.x - panStartClient.x;
        const dy = clientPt.y - panStartClient.y;
        
        const logicalDx = dx / camera.scale;
        const logicalDy = dy / camera.scale;

        setPoints(prev => prev.map(p => ({ x: p.x + logicalDx, y: p.y + logicalDy })));
        setPanStartClient(clientPt);
      } else if (isPanning && panStartClient) {
        const dx = clientPt.x - panStartClient.x;
        const dy = clientPt.y - panStartClient.y;

        if (isPhotoLocked) {
          // Pan camera
          setCamera(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
        } else {
          // Pan photo
          const logicalDx = dx / camera.scale;
          const logicalDy = dy / camera.scale;
          setImageTransform(prev => ({
            ...prev,
            offsetX: prev.offsetX + logicalDx,
            offsetY: prev.offsetY + logicalDy
          }));
        }
        setPanStartClient(clientPt); // update start
      }
    };
    
    const handlePointerUp = () => {
      setDraggingPoint(null);
      setIsDraggingPolygon(false);
      setIsPanning(false);
      setPanStartClient(null);
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
  }, [draggingPoint, isDraggingPolygon, isPanning, panStartClient, camera, isPhotoLocked, setPoints, setImageTransform]);

  const handleWheel = (e: React.WheelEvent) => {
    const clientPt = getClientPt(e);
    if (!clientPt) return;
    
    const zoomSensitivity = 0.001;
    const delta = -e.deltaY * zoomSensitivity;

    if (isPhotoLocked) {
      // Zoom camera
      setCamera(prev => {
        const newScale = Math.max(0.1, prev.scale * (1 + delta));
        const logicalX = (clientPt.x - prev.x) / prev.scale;
        const logicalY = (clientPt.y - prev.y) / prev.scale;
        
        const newX = clientPt.x - logicalX * newScale;
        const newY = clientPt.y - logicalY * newScale;
        return { scale: newScale, x: newX, y: newY };
      });
    } else {
      // Zoom photo
      setImageTransform(prev => {
        const newScale = Math.max(0.1, prev.scale * (1 + delta));
        return { ...prev, scale: newScale };
      });
    }
  };

  const handleContainerPointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    const pt = getClientPt(e);
    if (pt) {
      setIsPanning(true);
      setPanStartClient(pt);
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

  const fittedCells = useMemo(() => {
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
  }, [points, selectedCell, config.useHolders, config.caseThickness]);

  useEffect(() => {
    setFittedCellsCount(fittedCells.length);
  }, [fittedCells.length, setFittedCellsCount]);

  const usedCount = config.series * config.parallel;
  const renderedCells = fittedCells.slice(0, usedCount).map(c => ({...c, used: true}))
    .concat(fittedCells.slice(usedCount).map(c => ({...c, used: false})));

  const polygonPath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';

  return (
    <div className="canvas-container" ref={containerRef} onWheel={handleWheel} onPointerDown={handleContainerPointerDown} style={{cursor: isPanning ? 'grabbing' : 'default'}}>
      <div className="canvas-toolbar">
        <div className="toolbar-group">
          <button 
            className="glass-panel" 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', padding: 0 }}
          >
            ☰
          </button>
          <label className="glass-panel" style={{padding: '6px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center'}}>
            <input type="file" accept="image/*" onChange={handleImageUpload} style={{display:'none'}} />
            Upload Photo
          </label>
          <label className="glass-panel checkbox-group" style={{display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px'}}>
            <input 
              type="checkbox" 
              checked={isPhotoLocked} 
              onChange={(e) => setIsPhotoLocked(e.target.checked)} 
              disabled={!bgImage}
            />
            {isPhotoLocked ? "Workspace Locked (Global Zoom)" : "Edit Photo (Pan/Zoom Photo)"}
          </label>
        </div>
        <div className="toolbar-group">
          <button className="glass-panel" onClick={addPoint}>Add Node</button>
        </div>
      </div>

      <svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0 }}>
        {/* Draw Ruler Grid Pattern */}
        <defs>
          <pattern id="smallGrid" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
          </pattern>
          <pattern id="grid" width="100" height="100" patternUnits="userSpaceOnUse">
            <rect width="100" height="100" fill="url(#smallGrid)" />
            <path d="M 100 0 L 0 0 0 100" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
          </pattern>
        </defs>
        
        <g transform={`translate(${camera.x}, ${camera.y}) scale(${camera.scale})`}>
          {/* Infinite-like Background grid: we just draw a very large rect and shift it so grid lines stay aligned */}
          <rect 
            x={-10000} 
            y={-10000} 
            width="20000" 
            height="20000" 
            fill="url(#grid)" 
            pointerEvents="none" 
          />

          {bgImage && (
            <image 
              href={bgImage} 
              x="0" 
              y="0" 
              opacity={isPhotoLocked ? "0.8" : "1"}
              transform={`translate(${imageTransform.offsetX}, ${imageTransform.offsetY}) scale(${imageTransform.scale})`}
              pointerEvents="none"
              style={{ transition: 'opacity 0.2s' }}
            />
          )}

          <defs>
            <clipPath id="polygonClip">
              <path d={polygonPath} />
            </clipPath>
          </defs>

          {/* Case Thickness Zone (Internal Padding) */}
          {config.caseThickness > 0 && (
            <path 
              d={polygonPath} 
              clipPath="url(#polygonClip)" 
              fill="none" 
              stroke="rgba(255, 255, 255, 0.15)" 
              strokeWidth={config.caseThickness * 2} 
              strokeDasharray="4 4"
              pointerEvents="none"
              style={{ transition: 'stroke-width 0.1s' }}
            />
          )}

          <path 
            d={polygonPath} 
            fill="rgba(59, 130, 246, 0.15)" 
            stroke="var(--accent-color)" 
            strokeWidth="2" 
            style={{ cursor: 'move', pointerEvents: 'all' }}
            onPointerDown={(e) => {
              e.stopPropagation();
              setIsDraggingPolygon(true);
              const pt = getClientPt(e);
              if (pt) setPanStartClient(pt);
            }}
          />

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

          {points.map((p, i) => (
            <g key={`poly-${i}`}>
              <circle
                cx={p.x}
                cy={p.y}
                r={6 / camera.scale} // Keep node size visually constant when zooming
                fill="white"
                stroke="var(--accent-color)"
                strokeWidth={2 / camera.scale}
                style={{ cursor: 'move' }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  setDraggingPoint(i);
                }}
              />
              {points.length > 3 && (
                <text 
                  x={p.x + (10 / camera.scale)} 
                  y={p.y - (10 / camera.scale)} 
                  fill="red" 
                  fontSize={12 / camera.scale} 
                  style={{cursor: 'pointer'}} 
                  onClick={(e) => {e.stopPropagation(); removePoint(i);}}
                >
                  ×
                </text>
              )}
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
};

export default Workspace;
