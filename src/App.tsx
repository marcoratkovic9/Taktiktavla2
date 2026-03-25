import { useReducer, useRef } from 'react';
import type Konva from 'konva';
import { Toolbar } from './components/Toolbar';
import TacticsBoard from './components/TacticsBoard';
import { initialState, reducer } from './state';

const App = () => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const stageRef = useRef<Konva.Stage>(null!);

  const handleExport = () => {
    const stage = stageRef.current;
    if (!stage) {
      return;
    }

    const dataUrl = stage.toDataURL({
      pixelRatio: 2,
      mimeType: 'image/png',
    });

    const link = document.createElement('a');
    link.download = `tactics-board-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.png`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="app-shell">
      <Toolbar
        selectedTool={state.ui.selectedTool}
        pitchType={state.history.present.pitchType}
        pitchRotation={state.ui.pitchRotation}
        canUndo={state.history.past.length > 0}
        canRedo={state.history.future.length > 0}
        onToolChange={(tool) => dispatch({ type: 'set-tool', tool })}
        onPitchChange={(pitchType) => dispatch({ type: 'set-pitch', pitchType })}
        onPitchRotationChange={(rotation) => dispatch({ type: 'set-pitch-rotation', rotation })}
        onUndo={() => dispatch({ type: 'undo' })}
        onRedo={() => dispatch({ type: 'redo' })}
        onClearAll={() => dispatch({ type: 'clear-all' })}
        onExport={handleExport}
      />

      <main className="workspace">
        <section className="canvas-panel">
          <TacticsBoard state={state} dispatch={dispatch} stageRef={stageRef} />
        </section>
      </main>
    </div>
  );
};

export default App;
