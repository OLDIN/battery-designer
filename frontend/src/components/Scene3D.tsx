import React, { useMemo } from 'react';
import { Shape } from 'three';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment } from '@react-three/drei';
import type { CellModel, Point, PackConfig } from '../types';
import { getFittedCells } from '../utils/fitting';

interface Scene3DProps {
  points: Point[];
  selectedCell: CellModel | null;
  config: PackConfig;
}

// Battery cell: cylinder with + (red) and - (dark) terminals, can be flipped
const BatteryCell = ({ position, radius, height, color, flipped }: { position: [number, number, number], radius: number, height: number, color: string, flipped: boolean }) => {
  const capHeight = height * 0.03;
  const buttonRadius = radius * 0.35;
  const buttonHeight = height * 0.02;
  // If flipped, rotate 180° around X so + goes down and - goes up
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
      
      {/* Positive button (the raised nub) */}
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

// A flat nickel plate covering the bounding box of one P-group of cells
const NickelPlate = ({ groupCells, yPos, color }: { groupCells: Point[], yPos: number, color: string }) => {
  const { cx, cz, w, d } = useMemo(() => {
    if (groupCells.length === 0) return { cx: 0, cz: 0, w: 0, d: 0 };
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    groupCells.forEach(c => {
      minX = Math.min(minX, c.x); maxX = Math.max(maxX, c.x);
      minZ = Math.min(minZ, c.y); maxZ = Math.max(maxZ, c.y);
    });
    return {
      cx: (minX + maxX) / 2, cz: (minZ + maxZ) / 2,
      w: (maxX - minX) + 20, d: (maxZ - minZ) + 20
    };
  }, [groupCells]);

  if (groupCells.length === 0 || w === 0) return null;
  return (
    <mesh position={[cx, yPos, cz]}>
      <boxGeometry args={[w, 1.2, d]} />
      <meshStandardMaterial color={color} metalness={0.9} roughness={0.15} transparent opacity={0.7} />
    </mesh>
  );
};

// A thin wire/bridge between last cell of one P-group and first of the next
const SeriesBridge = ({ from, to, fromY, toY }: { from: Point, to: Point, fromY: number, toY: number }) => {
  const dx = to.x - from.x;
  const dz = to.y - from.y;
  const dy = toY - fromY;
  const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
  const midX = (from.x + to.x) / 2;
  const midY = (fromY + toY) / 2;
  const midZ = (from.y + to.y) / 2;
  const angle = Math.atan2(dz, dx);
  return (
    <mesh position={[midX, midY, midZ]} rotation={[0, -angle, 0]}>
      <cylinderGeometry args={[1.5, 1.5, length, 8]} />
      <meshStandardMaterial color="#f97316" metalness={0.8} roughness={0.2} />
    </mesh>
  );
};

// Renders one flat nickel plate per P-group + series bridges between groups
const NickelStrips = ({ cells, parallel, usedCount, cellHeight }: { cells: Point[], parallel: number, usedCount: number, cellHeight: number }) => {
  const elements = useMemo(() => {
    const result: React.ReactNode[] = [];
    const topY = cellHeight + 1.5;
    const botY = 1.5;

    const numGroups = Math.ceil(usedCount / parallel);

    for (let g = 0; g < numGroups; g++) {
      const isFlipped = g % 2 === 1;
      const plateY = isFlipped ? botY : topY; // plate on + face
      const groupCells = cells.slice(g * parallel, Math.min((g + 1) * parallel, usedCount));

      // Flat nickel plate covering this P-group
      result.push(
        <NickelPlate
          key={`plate-${g}`}
          groupCells={groupCells}
          yPos={plateY}
          color={isFlipped ? "#93c5fd" : "#fde68a"}
        />
      );

      // Series bridge: connect this group's + face to next group's - face
      if (g + 1 < numGroups) {
        const nextFlipped = !isFlipped;
        const lastCell = groupCells[groupCells.length - 1];
        const firstNextCell = cells[(g + 1) * parallel];
        if (lastCell && firstNextCell) {
          const fromY = isFlipped ? botY : topY;
          const toNextY = nextFlipped ? botY : topY;
          result.push(
            <SeriesBridge
              key={`bridge-${g}`}
              from={lastCell}
              to={firstNextCell}
              fromY={fromY}
              toY={toNextY}
            />
          );
        }
      }
    }
    return result;
  }, [cells, parallel, usedCount, cellHeight]);

  return <>{elements}</>;
};

const Scene3D: React.FC<Scene3DProps> = ({ points, selectedCell, config }) => {
  const fittedCells = useMemo(() => {
    return getFittedCells(points, selectedCell, config);
  }, [points, selectedCell, config]);

  const usedCount = config.series * config.parallel;
  const cellHeight = selectedCell?.length || 65;
  const cellRadius = (selectedCell?.diameter || 18) / 2;

  const showStrips = false;

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
          dampingFactor={0.05}
          rotateSpeed={0.8}
          target={[center.x, cellHeight / 2, center.z]}
        />
        
        <ambientLight intensity={0.6} />
        <directionalLight position={[500, 800, 300]} intensity={1.5} castShadow />
        <directionalLight position={[-300, 400, -200]} intensity={0.5} />
        
        <Environment preset="city" />
        
        <Ground />
        
        {/* Frame outline on the ground */}
        <FrameOutline points={points} />
        
        {/* Battery cells — groups of P cells alternate polarity (S1 up, S2 down, ...) */}
        {fittedCells.map((cell: Point, idx: number) => {
          const isUsed = idx < usedCount;
          // Every `parallel` used cells = one S-group
          const sGroup = isUsed ? Math.floor(idx / config.parallel) : -1;
          const isFlipped = isUsed && sGroup % 2 === 1;

          let cellColor = "#334155"; // unused - darker grey
          if (isUsed) {
            cellColor = isFlipped ? "#3b82f6" : "#10b981";
          }

          return (
            <BatteryCell
              key={idx}
              position={[cell.x, cellHeight / 2, cell.y]}
              radius={cellRadius}
              height={cellHeight}
              color={cellColor}
              flipped={isUsed && isFlipped}
            />
          );
        })}

        {/* Nickel strip connections */}
        {showStrips && (
          <NickelStrips
            cells={fittedCells}
            parallel={config.parallel}
            usedCount={usedCount}
            cellHeight={cellHeight}
          />
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
        <span style={{color: '#334155'}}>●</span> Unused ({Math.max(0, fittedCells.length - usedCount)})
      </div>
    </div>
  );
};

export default Scene3D;
