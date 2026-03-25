import { memo } from 'react';
import { PitchRotation, PitchType, Tool } from '../types';

interface ToolbarProps {
  selectedTool: Tool;
  pitchType: PitchType;
  pitchRotation: PitchRotation;
  canUndo: boolean;
  canRedo: boolean;
  onToolChange: (tool: Tool) => void;
  onPitchChange: (pitchType: PitchType) => void;
  onPitchRotationChange: (rotation: PitchRotation) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClearAll: () => void;
  onExport: () => void;
}

interface ToolOption {
  tool: Tool;
  label: string;
}

const markerTools: ToolOption[] = [
  { tool: 'move', label: 'Move' },
  { tool: 'add-red', label: 'Red' },
  { tool: 'add-blue', label: 'Blue' },
  { tool: 'add-ball', label: 'Ball' },
];

const drawTools: ToolOption[] = [
  { tool: 'arrow', label: 'Arrow' },
  { tool: 'freehand', label: 'Freehand' },
  { tool: 'dashed', label: 'Dashed' },
  { tool: 'erase', label: 'Erase' },
];

const ToolButton = ({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) => (
  <button
    type="button"
    className={`tool-button${active ? ' active' : ''}`}
    onClick={onClick}
  >
    {label}
  </button>
);

const ToolbarComponent = ({
  selectedTool,
  pitchType,
  pitchRotation,
  canUndo,
  canRedo,
  onToolChange,
  onPitchChange,
  onPitchRotationChange,
  onUndo,
  onRedo,
  onClearAll,
  onExport,
}: ToolbarProps) => (
  <header className="toolbar">
    <div className="toolbar-group">
      <span className="toolbar-label">Markers</span>
      <div className="toolbar-row">
        {markerTools.map((item) => (
          <ToolButton
            key={item.tool}
            active={selectedTool === item.tool}
            label={item.label}
            onClick={() => onToolChange(item.tool)}
          />
        ))}
      </div>
    </div>

    <div className="toolbar-group">
      <span className="toolbar-label">Draw</span>
      <div className="toolbar-row">
        {drawTools.map((item) => (
          <ToolButton
            key={item.tool}
            active={selectedTool === item.tool}
            label={item.label}
            onClick={() => onToolChange(item.tool)}
          />
        ))}
      </div>
    </div>

    <div className="toolbar-group">
      <span className="toolbar-label">Pitch</span>
      <div className="toolbar-row">
        <ToolButton
          active={pitchType === 'seven'}
          label="7-a-side"
          onClick={() => onPitchChange('seven')}
        />
        <ToolButton
          active={pitchType === 'eleven'}
          label="11-a-side"
          onClick={() => onPitchChange('eleven')}
        />
        <ToolButton
          active={pitchRotation === 90}
          label="Rotate 90°"
          onClick={() => onPitchRotationChange(pitchRotation === 90 ? 0 : 90)}
        />
      </div>
    </div>

    <div className="toolbar-group toolbar-group-actions">
      <span className="toolbar-label">Actions</span>
      <div className="toolbar-row">
        <button type="button" className="action-button" disabled={!canUndo} onClick={onUndo}>
          Undo
        </button>
        <button type="button" className="action-button" disabled={!canRedo} onClick={onRedo}>
          Redo
        </button>
        <button type="button" className="action-button" onClick={onClearAll}>
          Clear all
        </button>
        <button type="button" className="action-button action-button-primary" onClick={onExport}>
          Export PNG
        </button>
      </div>
    </div>
  </header>
);

export const Toolbar = memo(ToolbarComponent);
