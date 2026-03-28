import React, { useMemo, useState } from 'react';
import { Shape } from 'three';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, Html } from '@react-three/drei';
import type { CellModel, Point, PackConfig } from '../types';
import { getFittedCells } from '../utils/fitting';

interface Scene3DProps {
  points: Point[];
  selectedCell: CellModel | null;
  config: PackConfig;
}

// Battery cell: cylinder with + (red), - (dark) terminals, and fish paper insulation
const BatteryCell = ({ position, radius, height, color, flipped }: { position: [number, number, number], radius: number, height: number, color: string, flipped: boolean }) => {
  const capHeight = height * 0.03;
  const buttonRadius = radius * 0.35;
  const buttonHeight = height * 0.02;
  const rotation: [number, number, number] = flipped ? [Math.PI, 0, 0] : [0, 0, 0];
  
  return (
    <group position={position} rotation={rotation}>
      {/* Main cell body */}
      <mesh>
        <cylinderGeometry args={[radius, radius, height - capHeight * 2, 24]} />
        <meshStandardMaterial color={color} roughness={0.3} metalness={0.4} />
      </mesh>
      
      {/* Positive terminal cap (+) — red */}
      <mesh position={[0, height / 2 - capHeight / 2, 0]}>
        <cylinderGeometry args={[radius * 0.98, radius * 0.98, capHeight, 24]} />
        <meshStandardMaterial color="#ef4444" roughness={0.4} metalness={0.6} />
      </mesh>
      
      {/* Fish paper insulation ring (green/grey) on + terminal */}
      <mesh position={[0, height / 2 + 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[buttonRadius * 1.1, radius * 0.95, 32]} />
        <meshStandardMaterial color="#064e3b" roughness={0.5} />
      </mesh>
      
      {/* Positive button */}
      <mesh position={[0, height / 2 + buttonHeight / 2, 0]}>
        <cylinderGeometry args={[buttonRadius, buttonRadius, buttonHeight, 16]} />
        <meshStandardMaterial color="#dc2626" roughness={0.3} metalness={0.7} />
      </mesh>
      
      {/* Negative terminal cap (-) — dark */}
      <mesh position={[0, -height / 2 + capHeight / 2, 0]}>
        <cylinderGeometry args={[radius * 0.98, radius * 0.98, capHeight, 24]} />
        <meshStandardMaterial color="#1e293b" roughness={0.5} metalness={0.8} />
      </mesh>
    </group>
  );
};

// Frame outline on the ground (XZ plane)
const FrameOutline = ({ points }: { points: Point[] }) => {
  const shape = useMemo(() => {
    const s = new Shape();
    if (points.length > 0) {
      // In 2D: x=right, y=down. In 3D: x=right, z=forward.
      // Shape is drawn on XY, then rotated to lie on XZ.
      s.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        s.lineTo(points[i].x, points[i].y);
      }
      s.closePath();
    }
    return s;
  }, [points]);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
      <shapeGeometry args={[shape]} />
      <meshStandardMaterial color="#3b82f6" transparent opacity={0.25} side={2} />
    </mesh>
  );
};

// Ground plane
const Ground = () => (
  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
    <planeGeometry args={[5000, 5000]} />
    <meshStandardMaterial color="#0f172a" transparent opacity={0.8} />
  </mesh>
);

// A premium-look nickel connection (thick metallic bar)
const NickelConnection = ({ from, to, yPos, color }: { from: Point, to: Point, yPos: number, color: string }) => {
  const dx = to.x - from.x;
  const dz = to.y - from.y;
  const length = Math.sqrt(dx * dx + dz * dz);
  const angle = Math.atan2(dz, dx);
  const cx = (from.x + to.x) / 2;
  const cz = (from.y + to.y) / 2;
  
  return (
    <mesh position={[cx, yPos, cz]} rotation={[0, -angle, 0]}>
      <boxGeometry args={[length + 8, 1.2, 10]} />
      <meshStandardMaterial 
        color={color} 
        metalness={0.9} 
        roughness={0.1} 
        transparent 
        opacity={0.8} 
      />
    </mesh>
  );
};

// A thin series bridge between groups
const SeriesBridge = ({ from, to, fromY, toY }: { from: Point, to: Point, fromY: number, toY: number }) => {
  const dx = to.x - from.x;
  const dz = to.y - from.y;
  const dy = toY - fromY;
  const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
  const midX = (from.x + to.x) / 2;
  const midY = (fromY + toY) / 2;
  const midZ = (from.y + to.y) / 2;
  const angle = Math.atan2(dz, dx);
  const slant = Math.atan2(dy, Math.sqrt(dx * dx + dz * dz));
  
  return (
    <mesh position={[midX, midY, midZ]} rotation={[0, -angle, slant]}>
      <boxGeometry args={[length, 1.5, 6]} />
      <meshStandardMaterial color="#f97316" metalness={0.8} roughness={0.2} />
    </mesh>
  );
};

const Scene3D: React.FC<Scene3DProps> = ({ points, selectedCell, config }) => {
  const { fittedCells, groupedCells } = useMemo(() => {
    const rawCells = getFittedCells(points, selectedCell, config);
    if (rawCells.length === 0) return { fittedCells: [], groupedCells: [] };
    
    // Sort all cells to have a stable starting point (top-to-bottom, left-to-right)
    const available = [...rawCells].sort((a, b) => (a.y - b.y) || (a.x - b.x));
    const cellDiameter = selectedCell?.diameter || 18;
    const neighborThreshold = cellDiameter * 1.3; // threshold for being physical neighbors

    const groups: Point[][] = [];
    const pSize = config.parallel;
    const totalNeeded = config.series * config.parallel;
    const assigned = new Set<number>();

    // 1. Contiguous Clustering (BFS-style)
    while (assigned.size < Math.min(rawCells.length, totalNeeded)) {
      // Find the first unassigned seed (closest to the top)
      let seedIdx = -1;
      for (let i = 0; i < available.length; i++) {
        const originalIdx = rawCells.indexOf(available[i]);
        if (!assigned.has(originalIdx)) {
          seedIdx = originalIdx;
          break;
        }
      }
      if (seedIdx === -1) break;

      const group: Point[] = [rawCells[seedIdx]];
      assigned.add(seedIdx);
      
      const queue: number[] = [seedIdx];
      
      // Keep expanding the "blob" until it reaches pSize
      while (group.length < pSize && queue.length > 0) {
        const current = queue.shift()!;
        const c1 = rawCells[current];

        // Find unassigned neighbors of the current cell
        const neighbors: { idx: number, dist: number }[] = [];
        rawCells.forEach((c2, idx2) => {
          if (!assigned.has(idx2)) {
            const d = Math.sqrt(Math.pow(c1.x - c2.x, 2) + Math.pow(c1.y - c2.y, 2));
            if (d < neighborThreshold) {
              neighbors.push({ idx: idx2, dist: d });
            }
          }
        });

        // Sort neighbors by distance and add to group
        neighbors.sort((a,b) => a.dist - b.dist);
        for (const n of neighbors) {
          if (group.length < pSize) {
            group.push(rawCells[n.idx]);
            assigned.add(n.idx);
            queue.push(n.idx);
          } else break;
        }
      }

      // If group is still smaller than pSize but no neighbors, force-pick the closest (fallback)
      while (group.length < pSize && assigned.size < rawCells.length) {
          let bestIdx = -1;
          let minDist = Infinity;
          const gCenter = {
            x: group.reduce((sum, c) => sum + c.x, 0) / group.length,
            y: group.reduce((sum, c) => sum + c.y, 0) / group.length
          };

          rawCells.forEach((check, idx) => {
            if (!assigned.has(idx)) {
              const d = Math.sqrt(Math.pow(check.x - gCenter.x, 2) + Math.pow(check.y - gCenter.y, 2));
              if (d < minDist) {
                minDist = d;
                bestIdx = idx;
              }
            }
          });

          if (bestIdx !== -1) {
            group.push(rawCells[bestIdx]);
            assigned.add(bestIdx);
          } else break;
      }

      groups.push(group);
    }
    
    // 2. Sequence Groups (Greedy Pathfinding S1 -> S2 -> ...)
    // This ensures that S-groups are ordered by physical proximity
    const sequencedGroups: Point[][] = [];
    if (groups.length > 0) {
      // Start with the group containing the top-most cell (already sorted available[0])
      let currentIdx = 0;
      const unsequenced = [...groups];
      sequencedGroups.push(unsequenced.splice(currentIdx, 1)[0]);
      
      while (unsequenced.length > 0) {
        const lastGroup = sequencedGroups[sequencedGroups.length - 1];
        const lastCenter = {
          x: lastGroup.reduce((sum, c) => sum + c.x, 0) / lastGroup.length,
          y: lastGroup.reduce((sum, c) => sum + c.y, 0) / lastGroup.length
        };
        
        let bestIdx = 0;
        let minDist = Infinity;
        
        unsequenced.forEach((g, idx) => {
          const gCenter = {
            x: g.reduce((sum, c) => sum + c.x, 0) / g.length,
            y: g.reduce((sum, c) => sum + c.y, 0) / g.length
          };
          const d = Math.sqrt(Math.pow(gCenter.x - lastCenter.x, 2) + Math.pow(gCenter.y - lastCenter.y, 2));
          if (d < minDist) {
            minDist = d;
            bestIdx = idx;
          }
        });
        
        sequencedGroups.push(unsequenced.splice(bestIdx, 1)[0]);
      }
    }
    
    // Flatten for traditional "fittedCells" usage while keeping sequenced order
    const finalProcessedCells = sequencedGroups.flat();
    
    return { fittedCells: finalProcessedCells, groupedCells: sequencedGroups };
  }, [points, selectedCell, config]);

  const usedCount = config.series * config.parallel;
  const cellHeight = selectedCell?.length || 65;
  const cellRadius = (selectedCell?.diameter || 18) / 2;

  const [showStrips, setShowStrips] = useState(true);

  // Group metadata for strips
  const { seriesConnectionElements } = useMemo(() => {
    const results: React.ReactNode[] = [];
    if (groupedCells.length < 2) return { seriesConnectionElements: [] };
    
    const topY = cellHeight + 1;
    const botY = 1;

    for (let g = 0; g < groupedCells.length; g++) {
      const isFlipped = g % 2 === 1;
      const group = groupedCells[g];
      const nextGroup = groupedCells[g+1];
      const nextFlipped = !isFlipped;
      
      const negSideY = isFlipped ? topY : botY;

      // Draw series bridge to NEXT group (NEG of current to POS of next)
      if (nextGroup) {
        let bestPair = { c1: group[0], c2: nextGroup[0], dist: Infinity };
        group.forEach(c1 => {
          nextGroup.forEach(c2 => {
            const d = Math.sqrt(Math.pow(c1.x - c2.x, 2) + Math.pow(c1.y - c2.y, 2));
            if (d < bestPair.dist) bestPair = { c1, c2, dist: d };
          });
        });

        results.push(
          <SeriesBridge
            key={`bridge-${g}`}
            from={bestPair.c1}
            to={bestPair.c2}
            fromY={negSideY} // from Negative terminal
            toY={nextFlipped ? botY : topY} // to Next Positive terminal
          />
        );
      }
    }
    return { seriesConnectionElements: results };
  }, [groupedCells, cellHeight, selectedCell]);

  // Center of all cells for camera positioning
  const center = useMemo(() => {
    if (fittedCells.length === 0) {
      if (points.length === 0) return { x: 300, z: 250 };
      let sumX = 0, sumY = 0;
      points.forEach(p => { sumX += p.x; sumY += p.y; });
      return { x: sumX / points.length, z: sumY / points.length };
    }
    let sumX = 0, sumY = 0;
    fittedCells.forEach(c => { sumX += c.x; sumY += c.y; });
    return { x: sumX / fittedCells.length, z: sumY / fittedCells.length };
  }, [fittedCells, points]);

  // Camera distance based on bounding box
  const camDist = useMemo(() => {
    if (points.length === 0) return 400;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    points.forEach(p => {
      minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
    });
    return Math.max(maxX - minX, maxY - minY) * 1.2;
  }, [points]);

  // Stable target for OrbitControls
  const cameraTarget = useMemo(() => [center.x, cellHeight / 2, center.z] as [number, number, number], [center.x, center.z, cellHeight]);

  return (
    <div style={{ width: '100%', height: '100%', background: '#0f172a', position: 'relative' }}>
      <Canvas shadows>
        <PerspectiveCamera 
          makeDefault 
          position={[center.x - camDist * 0.5, camDist * 0.6, center.z + camDist * 0.8]} 
          fov={45} 
        />
        <OrbitControls 
          makeDefault
          enableDamping
          dampingFactor={0.1}
          rotateSpeed={1.0}
          panSpeed={0.5}
          target={cameraTarget}
          enableZoom={true}
          enablePan={true}
        />
        
        <ambientLight intensity={0.6} />
        <directionalLight position={[500, 800, 300]} intensity={1.5} castShadow />
        <directionalLight position={[-300, 400, -200]} intensity={0.5} />
        
        <Environment preset="city" />
        
        <Ground />
        
        {/* Frame outline on the ground */}
        <FrameOutline points={points} />
        
        {/* Battery cells — spatially clustered blocks */}
        {groupedCells.map((group, gIdx) => {
          const isFlipped = gIdx % 2 === 1;
          
          return group.map((cell, cIdx) => {
            const idx = gIdx * config.parallel + cIdx;
            const isUsed = idx < usedCount;
            
            let cellColor = "#334155"; // unused
            if (isUsed) {
              cellColor = isFlipped ? "#3b82f6" : "#10b981";
            }

            return (
              <BatteryCell
                key={`${gIdx}-${cIdx}`}
                position={[cell.x, cellHeight / 2, cell.y]}
                radius={cellRadius}
                height={cellHeight}
                color={cellColor}
                flipped={isUsed && isFlipped}
              />
            );
          });
        })}

        {/* Nickel strip connections */}
        {showStrips && (
          <>
            {groupedCells.map((group, g) => {
              const isFlipped = g % 2 === 1;
              const posSideY = isFlipped ? 1 : cellHeight + 1;
              const negSideY = isFlipped ? cellHeight + 1 : 1;
              
              if (g * config.parallel >= usedCount) return null;
              
              const avgX = group.reduce((sum, c) => sum + c.x, 0) / group.length;
              const avgZ = group.reduce((sum, c) => sum + c.y, 0) / group.length;

              const maxNeighborDist = (selectedCell?.diameter || 18 + 5) * 1.5;
              const posStrips: React.ReactNode[] = [];
              const negStrips: React.ReactNode[] = [];
              
              for (let i = 0; i < group.length; i++) {
                for (let j = i + 1; j < group.length; j++) {
                  const d = Math.sqrt(Math.pow(group[i].x - group[j].x, 2) + Math.pow(group[i].y - group[j].y, 2));
                  if (d < maxNeighborDist) {
                    // Positive side (plus) strips
                    posStrips.push(
                      <NickelConnection
                        key={`pos-conn-${g}-${i}-${j}`}
                        from={group[i]} to={group[j]}
                        yPos={posSideY}
                        color="#cbd5e1"
                      />
                    );
                    // Negative side (minus) strips
                    negStrips.push(
                      <NickelConnection
                        key={`neg-conn-${g}-${i}-${j}`}
                        from={group[i]} to={group[j]}
                        yPos={negSideY}
                        color="#64748b" // darker nickel
                      />
                    );
                  }
                }
              }
              
              return (
                <group key={`group-elements-${g}`}>
                   {posStrips}
                   {negStrips}
                   {/* S-group Identification Labels */}
                   <Html
                     position={[avgX, cellHeight + 15, avgZ]}
                     center
                     distanceFactor={400}
                   >
                     <div style={{ 
                       background: 'rgba(15, 23, 42, 0.8)', 
                       color: 'white', 
                       padding: '2px 6px', 
                       borderRadius: '4px', 
                       fontSize: '11px',
                       fontWeight: 600,
                       border: `1px solid ${isFlipped ? '#3b82f6' : '#10b981'}`,
                       pointerEvents: 'none',
                       whiteSpace: 'nowrap'
                     }}>
                       S{g + 1}
                     </div>
                   </Html>
                </group>
              );
            })}
            {seriesConnectionElements}
          </>
        )}
      </Canvas>
      
      <div style={{ 
        position: 'absolute', bottom: '20px', left: '20px', 
        color: 'white', background: 'rgba(0,0,0,0.6)', 
        padding: '12px 16px', borderRadius: '10px', fontSize: '13px',
        backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)'
      }}>
        <strong>🔋 3D View — {config.series}S{config.parallel}P</strong><br/>
        🖱 Drag to Rotate · Scroll to Zoom<br/>
        <span style={{color: '#10b981'}}>●</span> S-group + up &nbsp;
        <span style={{color: '#3b82f6'}}>●</span> S-group + down &nbsp;
        <span style={{color: '#334155'}}>●</span> Unused ({Math.max(0, fittedCells.length - usedCount)})<br/>
        <span style={{color: '#cbd5e1', borderBottom: '2px solid #cbd5e1'}}>▬▬</span> Nickel Plate (+ face) &nbsp;
        <span style={{color: '#f97316', borderBottom: '2px solid #f97316'}}>▬▬</span> Series Bridge
        <br/>
        <button 
          onClick={() => setShowStrips(s => !s)}
          style={{ 
            marginTop: '8px', 
            padding: '6px 12px', 
            fontSize: '12px', 
            background: showStrips ? '#3b82f6' : 'rgba(255,255,255,0.1)', 
            border: 'none', 
            borderRadius: '6px', 
            color: 'white', 
            cursor: 'pointer',
            transition: 'all 0.2s',
            fontWeight: 600
          }}
        >
          {showStrips ? '🔌 Hide connections' : '🔌 Show connections'}
        </button>
      </div>
    </div>
  );
};

export default Scene3D;
