import React, { useState } from 'react';
import type { CellModel, PackConfig, ImageTransform, ProjectData } from '../types';

interface SidebarProps {
  cells: CellModel[];
  selectedCell: CellModel | null;
  setSelectedCellId: (id: number) => void;
  config: PackConfig;
  setConfig: React.Dispatch<React.SetStateAction<PackConfig>>;
  maxParallel: number;
  fittedCellsCount: number;
  imageTransform: ImageTransform;
  
  savedProjects: ProjectData[];
  projectName: string;
  setProjectName: (name: string) => void;
  activeProjectId: number | null;
  onSaveAsNew: () => void;
  onUpdateCurrent: () => void;
  onLoadProject: (id: number) => void;
  onDeleteProject: (id: number) => void;

  isStandalone: boolean;
  isSidebarOpen: boolean;
  onExportFile: () => void;
  onImportFile: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  cells, selectedCell, setSelectedCellId, config, setConfig,
  maxParallel, fittedCellsCount, imageTransform,
  savedProjects, projectName, setProjectName, activeProjectId, 
  onSaveAsNew, onUpdateCurrent, onLoadProject, onDeleteProject,
  isStandalone, isSidebarOpen, onExportFile, onImportFile
}) => {
  const [selectedLoadId, setSelectedLoadId] = useState<string>('');

  return (
    <div className={`sidebar glass-panel ${!isSidebarOpen ? 'collapsed' : ''}`}>
      <h2>Battery Designer</h2>
      
      <div className="sidebar-section">
        <h3>1. Cell Setup</h3>
        <div className="form-group">
          <label>Select Cell Model</label>
          <select 
            value={selectedCell?.id || ''} 
            onChange={(e) => setSelectedCellId(Number(e.target.value))}
          >
            {cells.map(cell => (
              <option key={cell.id} value={cell.id}>
                {cell.brand} {cell.model} ({cell.formFactor})
              </option>
            ))}
          </select>
        </div>
        
        {selectedCell && (
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {selectedCell.capacity}mAh | {selectedCell.maxDischarge}A | Ø{selectedCell.diameter}mm x {selectedCell.length}mm
          </div>
        )}

        <label className="checkbox-group mt-2">
          <input 
            type="checkbox" 
            checked={config.useHolders} 
            onChange={(e) => setConfig({ ...config, useHolders: e.target.checked })}
          />
          Use Cell Holders (+1.5mm space)
        </label>
      </div>

      <div className="sidebar-section">
        <h3>2. View Info</h3>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          Background scale: {imageTransform.scale.toFixed(2)}x
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          Grid: 1 square = 10mm
        </div>
      </div>

      <div className="sidebar-section">
        <h3>3. Configuration</h3>
        <div className="form-group">
          <label>Target Series (Voltage)</label>
          <select 
            value={config.series} 
            onChange={(e) => setConfig({ ...config, series: Number(e.target.value) })}
          >
            <option value="10">36V (10S)</option>
            <option value="13">48V (13S)</option>
            <option value="14">52V (14S)</option>
            <option value="20">72V (20S)</option>
          </select>
        </div>
        
        <div className="form-group">
          <label>Target Parallel (Capacity)</label>
          <input 
            type="range" 
            min={1} 
            max={maxParallel || 1} 
            value={config.parallel} 
            onChange={(e) => setConfig({ ...config, parallel: Number(e.target.value) })}
          />
          <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '12px'}}>
            <span>1P</span>
            <span>Selected: {config.parallel}P</span>
            <span>Max: {maxParallel}P</span>
          </div>
        </div>

        <div className="form-group mt-3">
          <label>Case Thickness (Padding): {config.caseThickness}mm</label>
          <input 
            type="range" 
            min={0} 
            max={20} 
            step={1}
            value={config.caseThickness} 
            onChange={(e) => setConfig({ ...config, caseThickness: Number(e.target.value) })}
          />
          <div style={{fontSize: '11px', color: 'var(--text-muted)'}}>
            Z-zone from frame edges for bag/housing.
          </div>
        </div>
      </div>

      <div className="results-panel" style={{marginBottom: '20px'}}>
        <h3 style={{margin: '0 0 10px 0', fontSize: '14px', color: 'var(--text-muted)'}}>Pack Statistics</h3>
        
        <div className="result-row">
          <span>Total Cells in frame</span>
          <span className="result-value">{fittedCellsCount}</span>
        </div>
        <div className="result-row">
          <span>Used Configuration</span>
          <span className="result-value">{config.series}S {config.parallel}P ({config.series * config.parallel} cells)</span>
        </div>
        
        <hr style={{width: '100%', borderColor: 'rgba(255,255,255,0.1)', margin: '8px 0'}}/>
        
        <div className="result-row">
          <span>Nominal Voltage</span>
          <span className="result-value">
            {(config.series * 3.6).toFixed(1)} V
          </span>
        </div>
        <div className="result-row">
          <span>Total Capacity</span>
          <span className="result-value">
            {selectedCell ? ((selectedCell.capacity * config.parallel) / 1000).toFixed(1) : 0} Ah
          </span>
        </div>
        <div className="result-row">
          <span>Total Energy</span>
          <span className="result-value" style={{color: 'var(--accent-color)', fontWeight: 'bold'}}>
            {selectedCell ? (((selectedCell.capacity * config.parallel) / 1000) * (config.series * 3.6)).toFixed(0) : 0} Wh
          </span>
        </div>
        <div className="result-row">
          <span>Max Cont. Discharge</span>
          <span className="result-value">
            {selectedCell ? (selectedCell.maxDischarge * config.parallel).toFixed(1) : 0} A
          </span>
        </div>
        <div className="result-row">
          <span>Estimated Weight</span>
          <span className="result-value">
            {selectedCell ? ((selectedCell.weight * (config.series * config.parallel)) / 1000).toFixed(2) : 0} kg
          </span>
        </div>
      </div>
      
      <div className="sidebar-section">
        <h3>4. Project Info</h3>
        <div className="form-group">
          <label>Project Name</label>
          <input 
            type="text" 
            value={projectName} 
            onChange={(e) => setProjectName(e.target.value)} 
            className="glass-panel"
            style={{ width: '100%', padding: '8px', border: '1px solid rgba(255,255,255,0.1)', boxSizing: 'border-box' }}
          />
        </div>
      </div>

      {/* File Storage Section - Always visible */}
      <div className="sidebar-section file-storage">
        <h3>5. File Storage (.json)</h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={onExportFile}
            style={{ flex: 1, padding: '10px 0', background: 'rgba(59, 130, 246, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            💾 Download
          </button>
          <button 
            onClick={onImportFile}
            style={{ flex: 1, padding: '10px 0', background: 'rgba(16, 185, 129, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            📂 Upload
          </button>
        </div>
      </div>

      {/* Database Project Management - Hidden in Standalone mode if desired */}
      {!isStandalone && (
        <div className="sidebar-section project-management" style={{marginTop: '20px'}}>
          <h3 style={{display:'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            6. Database Management
            {activeProjectId && <span style={{fontSize:'10px', color: '#10b981', background: 'rgba(16, 185, 129, 0.2)', padding:'2px 6px', borderRadius:'10px'}}>Active</span>}
          </h3>
          
          <div className="form-group">
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                onClick={onSaveAsNew}
                style={{ flex: 1, padding: '8px', fontSize: '12px' }}
              >
                Save to DB
              </button>
              {activeProjectId && (
                <button 
                  onClick={onUpdateCurrent}
                  style={{ flex: 1, padding: '8px', fontSize: '12px', background: 'rgba(59, 130, 246, 0.4)', border: '1px solid #3b82f6' }}
                >
                  Update DB
                </button>
              )}
            </div>
          </div>

          <div className="form-group" style={{marginTop: '20px'}}>
            <label>Load from DB</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <select 
                value={selectedLoadId} 
                onChange={(e) => setSelectedLoadId(e.target.value)}
                style={{ flex: 1 }}
              >
                <option value="" disabled>Select project...</option>
                {savedProjects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <button 
                disabled={!selectedLoadId}
                onClick={() => onLoadProject(Number(selectedLoadId))}
                style={{ padding: '8px 12px' }}
              >
                Load
              </button>
              <button 
                disabled={!selectedLoadId}
                onClick={() => {
                  if (window.confirm('Are you sure you want to delete this project?')) {
                    onDeleteProject(Number(selectedLoadId));
                    setSelectedLoadId('');
                  }
                }}
                style={{ padding: '8px 12px', background: 'rgba(239, 68, 68, 0.4)', border: '1px solid #ef4444' }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="sidebar-section checklist-section" style={{marginTop: '20px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '20px'}}>
        <h3 style={{color: 'var(--accent-color)'}}>🚀 Build Checklist</h3>
        <p style={{fontSize: '11px', color: 'var(--text-muted)', marginBottom: '10px'}}>Don't forget to leave space for:</p>
        
        <div className="checklist-item">
          <label style={{display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', marginBottom: '6px'}}>
            <input type="checkbox" /> BMS (100x60x15mm)
          </label>
        </div>
        <div className="checklist-item">
          <label style={{display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', marginBottom: '6px'}}>
            <input type="checkbox" /> Main Wires (10-12AWG)
          </label>
        </div>
        <div className="checklist-item">
          <label style={{display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', marginBottom: '6px'}}>
            <input type="checkbox" /> Discharge Fuse
          </label>
        </div>
        <div className="checklist-item">
          <label style={{display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', marginBottom: '6px'}}>
            <input type="checkbox" /> Charge Port (DC/XT)
          </label>
        </div>
        <div className="checklist-item">
          <label style={{display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', marginBottom: '6px'}}>
            <input type="checkbox" /> Fish Paper Insulation
          </label>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
