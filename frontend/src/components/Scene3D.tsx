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

// Battery cell: cylinder standing upright (Y-axis is up in Three.js by default)
const BatteryCell = ({ position, radius, height, color }: { position: [number, number, number], radius: number, height: number, color: string }) => {
  return (
    <mesh position={position}>
      <cylinderGeometry args={[radius, radius, height, 24]} />
      <meshStandardMaterial color={color} roughness={0.3} metalness={0.4} />
    </mesh>
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

const Scene3D: React.FC<Scene3DProps> = ({ points, selectedCell, config }) => {
  const fittedCells = useMemo(() => {
    return getFittedCells(points, selectedCell, config);
  }, [points, selectedCell, config]);

  const usedCount = config.series * config.parallel;
  const cellHeight = selectedCell?.length || 65;
  const cellRadius = (selectedCell?.diameter || 18) / 2;

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
          target={[center.x, cellHeight / 2, center.z]} 
          maxPolarAngle={Math.PI / 2} 
        />
        
        <ambientLight intensity={0.6} />
        <directionalLight position={[500, 800, 300]} intensity={1.5} castShadow />
        <directionalLight position={[-300, 400, -200]} intensity={0.5} />
        
        <Environment preset="city" />
        
        <Ground />
        
        {/* Frame outline on the ground */}
        <FrameOutline points={points} />
        
        {/* Battery cells standing upright on XZ plane */}
        {fittedCells.map((cell: Point, idx: number) => (
          <BatteryCell 
            key={idx}
            position={[cell.x, cellHeight / 2, cell.y]}
            radius={cellRadius}
            height={cellHeight}
            color={idx < usedCount ? "#10b981" : "#475569"}
          />
        ))}
      </Canvas>
      
      <div style={{ 
        position: 'absolute', bottom: '20px', left: '20px', 
        color: 'white', background: 'rgba(0,0,0,0.6)', 
        padding: '12px 16px', borderRadius: '10px', fontSize: '13px',
        backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)'
      }}>
        <strong>🔋 3D View</strong><br/>
        🖱 Drag to Rotate · Scroll to Zoom<br/>
        <span style={{color: '#10b981'}}>●</span> Used ({Math.min(usedCount, fittedCells.length)}) &nbsp;
        <span style={{color: '#475569'}}>●</span> Unused ({Math.max(0, fittedCells.length - usedCount)})
      </div>
    </div>
  );
};

export default Scene3D;
