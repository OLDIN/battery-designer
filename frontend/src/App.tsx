import { useState, useEffect, useRef } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import './index.css';
import Sidebar from './components/Sidebar';
import Workspace from './components/Workspace';
import type { CellModel, Point, PackConfig, ImageTransform, ProjectData } from './types';
import { FALLBACK_CELLS } from './data/fallbackCells';

function App() {
  const [cells, setCells] = useState<CellModel[]>(FALLBACK_CELLS);
  const [selectedCellId, setSelectedCellId] = useState<number | null>(FALLBACK_CELLS[0].id);
  const [savedProjects, setSavedProjects] = useState<ProjectData[]>([]);
  
  const [projectName, setProjectName] = useState<string>('My Battery Pack');
  const [activeProjectId, setActiveProjectId] = useState<number | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Read environment variable (Vite style)
  const isStandalone = import.meta.env.VITE_STANDALONE === 'true';
  const backendUrl = 'http://localhost:3000';

  // Pack Configuration
  const [config, setConfig] = useState<PackConfig>({
    series: 13,
    parallel: 1,
    useHolders: true,
    caseThickness: 5
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
    if (isStandalone) return;

    fetch(`${backendUrl}/cells`)
      .then(res => res.json())
      .then(data => {
        if (data && data.length > 0) {
          setCells(data);
          setSelectedCellId(data[0].id);
        }
      })
      .catch(err => {
        console.warn('Backend cells unavailable, using fallback:', err);
      });
      
    fetch(`${backendUrl}/projects`)
      .then(res => res.json())
      .then(data => setSavedProjects(data))
      .catch(err => console.warn('Backend projects unavailable:', err));
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
    caseThickness: config.caseThickness,
    seriesVoltage: config.series,
    parallelCount: config.parallel
  });

  // --- DB Handlers ---
  const handleSaveAsNew = async () => {
    try {
      const res = await fetch(`${backendUrl}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(getProjectPayload(projectName))
      });
      const newProj = await res.json();
      setActiveProjectId(newProj.id);
      toast.success('Project saved as new successfully!');
      fetchData();
    } catch (e) {
      toast.error('Failed to save project to database.');
    }
  };

  const handleUpdateCurrent = async () => {
    if (!activeProjectId) return;
    try {
      await fetch(`${backendUrl}/projects/${activeProjectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(getProjectPayload(projectName))
      });
      toast.success('Project updated successfully!');
      fetchData();
    } catch (e) {
      toast.error('Failed to update project.');
    }
  };

  const handleLoadProject = async (id: number) => {
    try {
      const res = await fetch(`${backendUrl}/projects/${id}`);
      const data = await res.json();
      applyProjectData(data);
      toast.success('Project loaded from DB.');
    } catch (e) {
      toast.error('Failed to load project from database.');
    }
  };

  const handleDeleteProject = async (id: number) => {
    try {
      await fetch(`${backendUrl}/projects/${id}`, {
        method: 'DELETE'
      });
      toast.success('Project deleted.');
      if (activeProjectId === id) {
        setActiveProjectId(null);
        setProjectName('My Battery Pack');
      }
      fetchData();
    } catch (e) {
      toast.error('Failed to delete project.');
    }
  };

  // --- File Handlers ---
  const handleExportToFile = () => {
    const data = getProjectPayload(projectName);
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${projectName.replace(/\s+/g, '_')}_ebike.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportFromFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        applyProjectData(data);
        toast.success('Project imported from file successfully!');
      } catch (err) {
        toast.error('Failed to parse project file.');
      }
    };
    reader.readAsText(file);
    // Reset input value so same file can be selected again
    e.target.value = '';
  };

  // Helper to apply loaded data
  const applyProjectData = (data: any) => {
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
      useHolders: !!data.useHolders,
      caseThickness: data.caseThickness || 5
    });
    setProjectName(data.name || 'Imported pack');
    setActiveProjectId(data.id || null);
  };

  return (
    <div className="layout">
      {/* Hidden input for file import */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleImportFromFile} 
        style={{ display: 'none' }} 
        accept=".json"
      />

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

        isStandalone={isStandalone}
        onExportFile={handleExportToFile}
        onImportFile={() => fileInputRef.current?.click()}
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
      
      <Toaster 
        position="top-right"
        toastOptions={{
          style: {
            background: 'rgba(30, 41, 59, 0.8)',
            color: '#fff',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </div>
  );
}

export default App;
