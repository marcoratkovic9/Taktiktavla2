import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState, type Dispatch, type RefObject } from 'react';
import { Arrow, Circle, Group, Layer, Line, Rect, Stage, Text } from 'react-konva';
import Konva from 'konva';
import { AppState, BallMarker, DraftDrawing, DrawingObject, PitchRotation, PlayerMarker, Tool } from '../types';
import { Action } from '../state';
import { getPitchGeometry } from '../utils/pitch';

interface TacticsBoardProps {
  state: AppState;
  dispatch: Dispatch<Action>;
  stageRef: RefObject<Konva.Stage>;
}

interface Size {
  width: number;
  height: number;
}

const PLAYER_RADIUS = 23;
const BALL_RADIUS = 12;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const clampPoint = (x: number, y: number, width: number, height: number, padding: number) => ({
  x: clamp(x, padding, Math.max(padding, width - padding)),
  y: clamp(y, padding, Math.max(padding, height - padding)),
});

Konva.hitOnDragEnabled = true;
Konva.capturePointerEventsEnabled = true;

const getPointerPosition = (stage: Konva.Stage | null) => {
  if (!stage) {
    return null;
  }

  const position = stage.getPointerPosition();
  if (!position) {
    return null;
  }

  return {
    x: position.x,
    y: position.y,
  };
};

const drawFromDraft = (draft: DraftDrawing | null) => {
  if (!draft) {
    return null;
  }

  if (draft.kind === 'freehand') {
    return (
      <Line
        points={draft.points}
        stroke="#ffffff"
        strokeWidth={4}
        lineCap="round"
        lineJoin="round"
        tension={0}
      />
    );
  }

  const { start, current } = draft;
  const commonProps = {
    points: [start.x, start.y, current.x, current.y] as [number, number, number, number],
    stroke: '#ffffff',
    strokeWidth: draft.kind === 'arrow' ? 5 : 4,
    lineCap: 'round' as const,
    lineJoin: 'round' as const,
  };

  if (draft.kind === 'arrow') {
    return <Arrow {...commonProps} pointerLength={14} pointerWidth={12} fill="#ffffff" />;
  }

  return (
    <Arrow
      {...commonProps}
      dash={[14, 10]}
      pointerLength={14}
      pointerWidth={12}
      fill="#ffffff"
    />
  );
};

const renderDrawing = (drawing: DrawingObject, isEraseMode: boolean, onErase: (id: string) => void) => {
  const commonProps = {
    key: drawing.id,
    stroke: drawing.color,
    strokeWidth: drawing.strokeWidth,
    lineCap: 'round' as const,
    lineJoin: 'round' as const,
    onTap: isEraseMode ? () => onErase(drawing.id) : undefined,
    onClick: isEraseMode ? () => onErase(drawing.id) : undefined,
  };

  if (drawing.kind === 'arrow') {
    return (
      <Arrow
        {...commonProps}
        points={drawing.points}
        pointerLength={14}
        pointerWidth={12}
        fill={drawing.color}
      />
    );
  }

  if (drawing.kind === 'dashed') {
    return (
      <Arrow
        {...commonProps}
        points={drawing.points}
        dash={drawing.dash}
        pointerLength={14}
        pointerWidth={12}
        fill={drawing.color}
      />
    );
  }

  return <Line {...commonProps} points={drawing.points} />;
};

const MarkerNode = memo(
  ({
    marker,
    selectedTool,
    onMoveEnd,
    onErase,
  }: {
    marker: PlayerMarker;
    selectedTool: Tool;
    onMoveEnd: (id: string, x: number, y: number) => void;
    onErase: (id: string) => void;
  }) => {
    const fill = marker.team === 'red' ? '#c9352c' : '#2e62d9';
    return (
      <Group
        x={marker.x}
        y={marker.y}
        draggable={selectedTool === 'move'}
        onDragEnd={(event) => {
          const position = event.target.position();
          onMoveEnd(marker.id, position.x, position.y);
        }}
        onTap={selectedTool === 'erase' ? () => onErase(marker.id) : undefined}
        onClick={selectedTool === 'erase' ? () => onErase(marker.id) : undefined}
      >
        <Circle radius={PLAYER_RADIUS} fill={fill} stroke="#ffffff" strokeWidth={3} />
        <Text
          text={String(marker.number)}
          fill="#ffffff"
          fontSize={20}
          fontStyle="bold"
          width={PLAYER_RADIUS * 2}
          height={PLAYER_RADIUS * 2}
          offsetX={PLAYER_RADIUS}
          offsetY={PLAYER_RADIUS}
          align="center"
          verticalAlign="middle"
          listening={false}
        />
      </Group>
    );
  },
);

MarkerNode.displayName = 'MarkerNode';

const BallNode = memo(
  ({
    ball,
    selectedTool,
    onMoveEnd,
    onErase,
  }: {
    ball: BallMarker;
    selectedTool: Tool;
    onMoveEnd: (id: string, x: number, y: number) => void;
    onErase: (id: string) => void;
  }) => (
    <Group
      x={ball.x}
      y={ball.y}
      draggable={selectedTool === 'move'}
      onDragEnd={(event) => {
        const position = event.target.position();
        onMoveEnd(ball.id, position.x, position.y);
      }}
      onTap={selectedTool === 'erase' ? () => onErase(ball.id) : undefined}
      onClick={selectedTool === 'erase' ? () => onErase(ball.id) : undefined}
    >
      <Circle radius={BALL_RADIUS} fill="#ffffff" stroke="#1b1b1b" strokeWidth={2} />
      <Circle radius={BALL_RADIUS / 2.4} fill="#1b1b1b" listening={false} />
    </Group>
  ),
);

BallNode.displayName = 'BallNode';

const PitchLayer = memo(
  ({
    width,
    height,
    pitchType,
    pitchRotation,
  }: Size & {
    pitchType: AppState['history']['present']['pitchType'];
    pitchRotation: PitchRotation;
  }) => {
  const geometry = useMemo(() => getPitchGeometry(width, height, pitchType), [width, height, pitchType]);
  const fieldX = geometry.outerInset;
  const fieldY = geometry.outerInset;
  const fieldWidth = width - geometry.outerInset * 2;
  const fieldHeight = height - geometry.outerInset * 2;
  const midX = fieldX + fieldWidth / 2;
  const midY = fieldY + fieldHeight / 2;
  const topPenaltyY = midY - geometry.penaltyBoxWidth / 2;
  const topGoalY = midY - geometry.goalAreaWidth / 2;

  return (
    <Layer listening={false}>
      <Group x={width / 2} y={height / 2} rotation={pitchRotation} offsetX={width / 2} offsetY={height / 2}>
        <Rect x={0} y={0} width={width} height={height} fill="#4a9e4a" />
        <Rect x={fieldX} y={fieldY} width={fieldWidth} height={fieldHeight} stroke="#ffffff" strokeWidth={3} />
        <Line points={[midX, fieldY, midX, fieldY + fieldHeight]} stroke="#ffffff" strokeWidth={3} />
        <Circle x={midX} y={midY} radius={geometry.centerCircleRadius} stroke="#ffffff" strokeWidth={3} />
        <Circle x={midX} y={midY} radius={4} fill="#ffffff" />

        <Rect
          x={fieldX}
          y={topPenaltyY}
          width={geometry.penaltyBoxDepth}
          height={geometry.penaltyBoxWidth}
          stroke="#ffffff"
          strokeWidth={3}
        />
        <Rect
          x={fieldX + fieldWidth - geometry.penaltyBoxDepth}
          y={topPenaltyY}
          width={geometry.penaltyBoxDepth}
          height={geometry.penaltyBoxWidth}
          stroke="#ffffff"
          strokeWidth={3}
        />
        <Rect
          x={fieldX}
          y={topGoalY}
          width={geometry.goalAreaDepth}
          height={geometry.goalAreaWidth}
          stroke="#ffffff"
          strokeWidth={3}
        />
        <Rect
          x={fieldX + fieldWidth - geometry.goalAreaDepth}
          y={topGoalY}
          width={geometry.goalAreaDepth}
          height={geometry.goalAreaWidth}
          stroke="#ffffff"
          strokeWidth={3}
        />

        <Circle x={fieldX + geometry.penaltyMarkOffset} y={midY} radius={4} fill="#ffffff" />
        <Circle x={fieldX + fieldWidth - geometry.penaltyMarkOffset} y={midY} radius={4} fill="#ffffff" />
      </Group>
    </Layer>
  );
});

PitchLayer.displayName = 'PitchLayer';

export const TacticsBoard = ({ state, dispatch, stageRef }: TacticsBoardProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const lastTouchTimeRef = useRef(0);
  const [size, setSize] = useState<Size>({ width: 320, height: 320 });

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return undefined;
    }

    const measure = () => {
      const rect = container.getBoundingClientRect();
      const nextWidth = Math.max(320, Math.floor(rect.width));
      const nextHeight = Math.max(320, Math.floor(rect.height));
      setSize((current) =>
        current.width === nextWidth && current.height === nextHeight
          ? current
          : { width: nextWidth, height: nextHeight },
      );
    };

    measure();

    const resizeObserver =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => {
            measure();
          })
        : null;

    if (resizeObserver) {
      resizeObserver.observe(container);
    }

    let rafId = 0;
    const handleResize = () => {
      cancelAnimationFrame(rafId);
      rafId = window.requestAnimationFrame(measure);
    };

    window.addEventListener('resize', handleResize);
    const visualViewport = window.visualViewport;
    if (visualViewport) {
      visualViewport.addEventListener('resize', handleResize);
      visualViewport.addEventListener('scroll', handleResize);
    }

    return () => {
      cancelAnimationFrame(rafId);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      window.removeEventListener('resize', handleResize);
      if (visualViewport) {
        visualViewport.removeEventListener('resize', handleResize);
        visualViewport.removeEventListener('scroll', handleResize);
      }
    };
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) {
      return undefined;
    }

    const stageContainer = stage.container();
    let isTouchLocked = false;

    const preventGesture = (event: Event) => {
      event.preventDefault();
    };
    const lockTouchScroll = () => {
      isTouchLocked = true;
      document.body.classList.add('board-touch-locked');
    };
    const unlockTouchScroll = () => {
      isTouchLocked = false;
      document.body.classList.remove('board-touch-locked');
    };
    const preventTouchScroll = (event: TouchEvent) => {
      if (!isTouchLocked) {
        return;
      }

      event.preventDefault();
    };

    stageContainer.style.touchAction = 'none';
    stageContainer.addEventListener('gesturestart', preventGesture);
    stageContainer.addEventListener('gesturechange', preventGesture);
    stageContainer.addEventListener('touchstart', lockTouchScroll, { passive: true });
    stageContainer.addEventListener('touchend', unlockTouchScroll);
    stageContainer.addEventListener('touchcancel', unlockTouchScroll);
    stageContainer.addEventListener('touchmove', preventTouchScroll, { passive: false });

    return () => {
      unlockTouchScroll();
      stageContainer.removeEventListener('gesturestart', preventGesture);
      stageContainer.removeEventListener('gesturechange', preventGesture);
      stageContainer.removeEventListener('touchstart', lockTouchScroll);
      stageContainer.removeEventListener('touchend', unlockTouchScroll);
      stageContainer.removeEventListener('touchcancel', unlockTouchScroll);
      stageContainer.removeEventListener('touchmove', preventTouchScroll);
    };
  }, [size.width, size.height]);

  const selectedTool = state.ui.selectedTool;
  const present = state.history.present;
  const isDrawTool = selectedTool === 'arrow' || selectedTool === 'freehand' || selectedTool === 'dashed';
  const syntheticMouseThresholdMs = 750;

  const beginDraft = () => {
    const stage = stageRef.current;
    const pointer = getPointerPosition(stage);
    if (!pointer) {
      return;
    }

    const clamped = clampPoint(pointer.x, pointer.y, size.width, size.height, 4);

    if (selectedTool === 'arrow' || selectedTool === 'dashed') {
      dispatch({
        type: 'start-draft',
        draft: {
          kind: selectedTool,
          start: clamped,
          current: clamped,
        },
      });
    }

    if (selectedTool === 'freehand') {
      dispatch({
        type: 'start-draft',
        draft: {
          kind: 'freehand',
          points: [clamped.x, clamped.y],
        },
      });
    }
  };

  const updateDraft = () => {
    if (!state.ui.draft) {
      return;
    }

    const pointer = getPointerPosition(stageRef.current);
    if (!pointer) {
      return;
    }

    dispatch({
      type: 'update-draft',
      point: clampPoint(pointer.x, pointer.y, size.width, size.height, 4),
    });
  };

  const commitDraft = () => {
    if (!state.ui.draft) {
      return;
    }
    dispatch({ type: 'commit-draft' });
  };

  const handleStagePointerDown = (event: Konva.KonvaEventObject<PointerEvent | TouchEvent | MouseEvent>) => {
    const nativeEvent = event.evt;
    const isTouchEvent = 'touches' in nativeEvent || 'changedTouches' in nativeEvent;
    const isMouseEvent = 'button' in nativeEvent;
    const now = Date.now();

    if (isTouchEvent) {
      lastTouchTimeRef.current = now;
    }

    if (isMouseEvent && now - lastTouchTimeRef.current < syntheticMouseThresholdMs) {
      return;
    }

    const stage = stageRef.current;
    const pointer = getPointerPosition(stage);
    if (!pointer) {
      return;
    }

    if (isDrawTool) {
      beginDraft();
      return;
    }

    if (event.target !== event.target.getStage()) {
      return;
    }

    const playerPlacement = clampPoint(pointer.x, pointer.y, size.width, size.height, PLAYER_RADIUS + 4);
    const ballPlacement = clampPoint(pointer.x, pointer.y, size.width, size.height, BALL_RADIUS + 4);

    if (selectedTool === 'add-red') {
      dispatch({ type: 'add-player', team: 'red', x: playerPlacement.x, y: playerPlacement.y });
      return;
    }

    if (selectedTool === 'add-blue') {
      dispatch({ type: 'add-player', team: 'blue', x: playerPlacement.x, y: playerPlacement.y });
      return;
    }

    if (selectedTool === 'add-ball') {
      dispatch({ type: 'place-ball', x: ballPlacement.x, y: ballPlacement.y });
      return;
    }
  };

  const drawings = useMemo(
    () =>
      present.drawings.map((drawing) =>
        renderDrawing(drawing, selectedTool === 'erase', (id) =>
          dispatch({ type: 'erase-object', target: { kind: 'drawing', id } }),
        ),
      ),
    [dispatch, present.drawings, selectedTool],
  );

  return (
    <div ref={containerRef} className="board-shell">
      <Stage
        ref={stageRef}
        width={size.width}
        height={size.height}
        onMouseDown={handleStagePointerDown}
        onTouchStart={handleStagePointerDown}
        onMouseMove={isDrawTool ? updateDraft : undefined}
        onTouchMove={isDrawTool ? updateDraft : undefined}
        onMouseUp={isDrawTool ? commitDraft : undefined}
        onTouchEnd={isDrawTool ? commitDraft : undefined}
        onTouchCancel={isDrawTool ? () => dispatch({ type: 'cancel-draft' }) : undefined}
      >
        <PitchLayer
          width={size.width}
          height={size.height}
          pitchType={present.pitchType}
          pitchRotation={state.ui.pitchRotation}
        />

        <Layer>
          {drawings}
          {drawFromDraft(state.ui.draft)}
        </Layer>

        <Layer>
          {present.players.map((player) => (
            <MarkerNode
              key={player.id}
              marker={player}
              selectedTool={selectedTool}
              onMoveEnd={(id, x, y) => {
                const clamped = clampPoint(x, y, size.width, size.height, PLAYER_RADIUS + 4);
                dispatch({ type: 'move-player', id, x: clamped.x, y: clamped.y });
              }}
              onErase={(id) => dispatch({ type: 'erase-object', target: { kind: 'player', id } })}
            />
          ))}

          {present.ball ? (
            <BallNode
              ball={present.ball}
              selectedTool={selectedTool}
              onMoveEnd={(id, x, y) => {
                const clamped = clampPoint(x, y, size.width, size.height, BALL_RADIUS + 4);
                dispatch({ type: 'move-ball', id, x: clamped.x, y: clamped.y });
              }}
              onErase={(id) => dispatch({ type: 'erase-object', target: { kind: 'ball', id } })}
            />
          ) : null}
        </Layer>
      </Stage>
    </div>
  );
};

export default memo(TacticsBoard);
