export type Team = 'red' | 'blue';
export type PitchType = 'seven' | 'eleven';
export type Tool = 'move' | 'add-red' | 'add-blue' | 'add-ball' | 'arrow' | 'freehand' | 'dashed' | 'erase';
export type PitchRotation = 0 | 90;

export interface Point {
  x: number;
  y: number;
}

export interface PlayerMarker {
  id: string;
  kind: 'player';
  team: Team;
  number: number;
  x: number;
  y: number;
}

export interface BallMarker {
  id: string;
  kind: 'ball';
  x: number;
  y: number;
}

export interface ArrowDrawing {
  id: string;
  kind: 'arrow';
  points: [number, number, number, number];
  color: string;
  strokeWidth: number;
}

export interface DashedLineDrawing {
  id: string;
  kind: 'dashed';
  points: [number, number, number, number];
  color: string;
  strokeWidth: number;
  dash: [number, number];
}

export interface FreehandDrawing {
  id: string;
  kind: 'freehand';
  points: number[];
  color: string;
  strokeWidth: number;
}

export type DrawingObject = ArrowDrawing | DashedLineDrawing | FreehandDrawing;

export interface BoardSnapshot {
  pitchType: PitchType;
  players: PlayerMarker[];
  ball: BallMarker | null;
  drawings: DrawingObject[];
}

export interface HistoryModel {
  past: BoardSnapshot[];
  present: BoardSnapshot;
  future: BoardSnapshot[];
}

export type DraftDrawing =
  | {
      kind: 'arrow';
      start: Point;
      current: Point;
    }
  | {
      kind: 'dashed';
      start: Point;
      current: Point;
    }
  | {
      kind: 'freehand';
      points: number[];
    };

export interface UIState {
  selectedTool: Tool;
  draft: DraftDrawing | null;
  pitchRotation: PitchRotation;
}

export interface AppState {
  history: HistoryModel;
  ui: UIState;
}

export type EraseTarget =
  | { kind: 'player'; id: string }
  | { kind: 'ball'; id: string }
  | { kind: 'drawing'; id: string };
