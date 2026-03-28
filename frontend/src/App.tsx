import { useState, useEffect } from 'react';
import './index.css';
import Sidebar from './components/Sidebar';
import Workspace from './components/Workspace';
import type { CellModel, Point, PackConfig, ImageTransform, ProjectData } from './types';

function App() {
  const [cells, setCells] = useState<CellModel[]>([]);
  const [selectedCellId, setSelectedCellId] = useState<number | null>(null);
  const [savedProjects, setSavedProjects] = useState<ProjectData[]>([]);
  
  const [projectName, setProjectName] = useState<string>('My Battery Pack');
  const [activeProjectId, setActiveProjectId] = useState<number | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  
  // Pack Configuration
  const [config, setConfig] = useState<PackConfig>({
    series: 13,
    parallel: 1,
    useHolders: true
  });

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
  
  const [fittedCellsCount, setFittedCellsCount] = useState<number>(0);

  // Initial Fetch data
  const fetchData = () => {
    fetch('http://localhost:3000/cells')
      .then(res => res.json())
      .then(data => {
        setCells(data);
        if (data.length > 0 && selectedCellId === null) {
          setSelectedCellId(data[0].id);
        }
      })
      .catch(err => console.error('Error fetching cells:', err));
      
    fetch('http://localhost:3000/projects')
      .then(res => res.json())
      .then(data => setSavedProjects(data))
      .catch(err => console.error('Error fetching projects:', err));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const selectedCell = cells.find(c => c.id === selectedCellId) || null;

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

  const getProjectPayload = (name: string) => ({
    name,
    polygonPoints: JSON.stringify(points),
    imageBase64: bgImage,
    imageScale: imageTransform.scale,
    imageOffsetX: imageTransform.offsetX,
    imageOffsetY: imageTransform.offsetY,
    cellModelId: selectedCellId,
    useHolders: config.useHolders,
    seriesVoltage: config.series,
    parallelCount: config.parallel
  });

  const handleSaveAsNew = async () => {
    try {
      const res = await fetch('http://localhost:3000/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(getProjectPayload(projectName))
      });
      const newProj = await res.json();
      setActiveProjectId(newProj.id);
      alert('Project saved as new successfully!');
      fetchData(); // refresh list
    } catch (e) {
      alert('Failed to save project.');
    }
  };

  const handleUpdateCurrent = async () => {
    if (!activeProjectId) return;
    try {
      await fetch(`http://localhost:3000/projects/${activeProjectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(getProjectPayload(projectName))
      });
      alert('Project updated successfully!');
      fetchData(); // refresh list in case name changed
    } catch (e) {
      alert('Failed to update project.');
    }
  };

  const handleLoadProject = async (id: number) => {
    try {
      const res = await fetch(`http://localhost:3000/projects/${id}`);
      const data = await res.json();
      if (data.polygonPoints) setPoints(JSON.parse(data.polygonPoints));
      setBgImage(data.imageBase64 || null);
      setImageTransform({
        scale: data.imageScale || 1,
        offsetX: data.imageOffsetX || 0,
        offsetY: data.imageOffsetY || 0
      });
      if (data.cellModelId) setSelectedCellId(data.cellModelId);
      setConfig({
        series: data.seriesVoltage || 13,
        parallel: data.parallelCount || 1,
        useHolders: !!data.useHolders
      });
      setProjectName(data.name);
      setActiveProjectId(data.id);
    } catch (e) {
      alert('Failed to load project.');
    }
  };

  const handleDeleteProject = async (id: number) => {
    try {
      await fetch(`http://localhost:3000/projects/${id}`, {
        method: 'DELETE'
      });
      alert('Project deleted.');
      if (activeProjectId === id) {
        setActiveProjectId(null);
        setProjectName('My Battery Pack');
      }
      fetchData();
    } catch (e) {
      alert('Failed to delete project.');
    }
  };

  return (
    <div className="layout">
      <Sidebar 
        isSidebarOpen={isSidebarOpen}
        cells={cells}
        selectedCell={selectedCell}
        setSelectedCellId={setSelectedCellId}
        config={config}
        setConfig={setConfig}
        maxParallel={maxParallel}
        fittedCellsCount={fittedCellsCount}
        imageTransform={imageTransform}
        
        savedProjects={savedProjects}
        projectName={projectName}
        setProjectName={setProjectName}
        activeProjectId={activeProjectId}
        onSaveAsNew={handleSaveAsNew}
        onUpdateCurrent={handleUpdateCurrent}
        onLoadProject={handleLoadProject}
        onDeleteProject={handleDeleteProject}
      />
      <Workspace 
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
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
