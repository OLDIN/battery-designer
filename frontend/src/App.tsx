import { useState, useEffect } from 'react';
import './index.css';
import Sidebar from './components/Sidebar';
import Workspace from './components/Workspace';
import type { CellModel, Point, PackConfig } from './types';

function App() {
  const [cells, setCells] = useState<CellModel[]>([]);
  const [selectedCellId, setSelectedCellId] = useState<number | null>(null);
  
  // Pack Configuration
  const [config, setConfig] = useState<PackConfig>({
    series: 13,
    parallel: 1,
    useHolders: true
  });

  // Calculate maximum parallel cells based on how many cells fit inside polygon
  const [maxParallel, setMaxParallel] = useState<number>(0);

  // Canvas State
  const [points, setPoints] = useState<Point[]>([
    { x: 100, y: 100 },
    { x: 600, y: 100 },
    { x: 200, y: 400 }
  ]);
  const [bgImage, setBgImage] = useState<string | null>(null);
  
  // Calibration
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationLine, setCalibrationLine] = useState<[Point, Point] | null>(null);
  const [calibrationMm, setCalibrationMm] = useState<number>(500);
  const [pixelsPerMm, setPixelsPerMm] = useState<number>(1); // 1 px = 1 mm default
  
  // Number of cells that physically fit inside the polygon
  const [fittedCellsCount, setFittedCellsCount] = useState<number>(0);

  useEffect(() => {
    // Fetch cells from backend
    fetch('http://localhost:3000/cells')
      .then(res => res.json())
      .then(data => {
        setCells(data);
        if (data.length > 0) {
          setSelectedCellId(data[0].id);
        }
      })
      .catch(err => console.error('Error fetching cells:', err));
  }, []);

  const selectedCell = cells.find(c => c.id === selectedCellId) || null;

  // Once fitted cells count changes, recalculate max parallel
  useEffect(() => {
    if (fittedCellsCount > 0 && config.series > 0) {
      const maxP = Math.floor(fittedCellsCount / config.series);
      setMaxParallel(maxP);
      if (config.parallel > maxP) {
        setConfig(prev => ({ ...prev, parallel: maxP === 0 ? 1 : maxP }));
      }
    } else {
      setMaxParallel(0);
    }
  }, [fittedCellsCount, config.series]);

  // Recalculate calibration ratio when line or mm changes
  useEffect(() => {
    if (calibrationLine && calibrationMm > 0) {
      const dx = calibrationLine[1].x - calibrationLine[0].x;
      const dy = calibrationLine[1].y - calibrationLine[0].y;
      const pixelDist = Math.sqrt(dx * dx + dy * dy);
      setPixelsPerMm(pixelDist / calibrationMm);
    } else {
      setPixelsPerMm(1);
    }
  }, [calibrationLine, calibrationMm]);

  return (
    <div className="layout">
      <Sidebar 
        cells={cells}
        selectedCell={selectedCell}
        setSelectedCellId={setSelectedCellId}
        config={config}
        setConfig={setConfig}
        maxParallel={maxParallel}
        fittedCellsCount={fittedCellsCount}
        calibrationMm={calibrationMm}
        setCalibrationMm={setCalibrationMm}
        pixelsPerMm={pixelsPerMm}
      />
      <Workspace 
        points={points}
        setPoints={setPoints}
        bgImage={bgImage}
        setBgImage={setBgImage}
        selectedCell={selectedCell}
        config={config}
        pixelsPerMm={pixelsPerMm}
        setFittedCellsCount={setFittedCellsCount}
        isCalibrating={isCalibrating}
        setIsCalibrating={setIsCalibrating}
        calibrationLine={calibrationLine}
        setCalibrationLine={setCalibrationLine}
      />
    </div>
  );
}

export default App;
