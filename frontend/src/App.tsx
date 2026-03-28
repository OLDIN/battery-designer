import { useState, useEffect } from 'react';
import './index.css';
import Sidebar from './components/Sidebar';
import Workspace from './components/Workspace';
import type { CellModel, Point, PackConfig, ImageTransform } from './types';

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

  // Canvas State: 1 unit = 1 mm
  const [points, setPoints] = useState<Point[]>([
    { x: 100, y: 100 },
    { x: 600, y: 100 },
    { x: 200, y: 400 }
  ]);
  const [bgImage, setBgImage] = useState<string | null>(null);
  
  // Image Transformations (Pan & Zoom)
  const [imageTransform, setImageTransform] = useState<ImageTransform>({
    scale: 1,
    offsetX: 0,
    offsetY: 0
  });
  
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
        imageTransform={imageTransform}
      />
      <Workspace 
        points={points}
        setPoints={setPoints}
        bgImage={bgImage}
        setBgImage={setBgImage}
        selectedCell={selectedCell}
        config={config}
        setFittedCellsCount={setFittedCellsCount}
        imageTransform={imageTransform}
        setImageTransform={setImageTransform}
      />
    </div>
  );
}

export default App;
