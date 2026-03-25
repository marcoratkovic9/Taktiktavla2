import {
  AppState,
  ArrowDrawing,
  BoardSnapshot,
  DashedLineDrawing,
  DraftDrawing,
  DrawingObject,
  EraseTarget,
  FreehandDrawing,
  PitchRotation,
  PitchType,
  PlayerMarker,
  Team,
  Tool,
} from './types';

export type Action =
  | { type: 'set-tool'; tool: Tool }
  | { type: 'set-pitch'; pitchType: PitchType }
  | { type: 'set-pitch-rotation'; rotation: PitchRotation }
  | { type: 'add-player'; team: Team; x: number; y: number }
  | { type: 'place-ball'; x: number; y: number }
  | { type: 'move-player'; id: string; x: number; y: number }
  | { type: 'move-ball'; id: string; x: number; y: number }
  | { type: 'erase-object'; target: EraseTarget }
  | { type: 'clear-all' }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'start-draft'; draft: DraftDrawing }
  | { type: 'update-draft'; point: { x: number; y: number } }
  | { type: 'commit-draft' }
  | { type: 'cancel-draft' };

const createId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `id-${Math.random().toString(36).slice(2, 11)}`;
};

const cloneDrawing = (drawing: DrawingObject): DrawingObject => {
  if (drawing.kind === 'freehand') {
    const freehand: FreehandDrawing = {
      ...drawing,
      points: [...drawing.points],
    };
    return freehand;
  }

  if (drawing.kind === 'arrow') {
    const arrow: ArrowDrawing = {
      ...drawing,
      points: [...drawing.points] as ArrowDrawing['points'],
    };
    return arrow;
  }

  if (drawing.kind === 'dashed') {
    const dashed: DashedLineDrawing = {
      ...drawing,
      points: [...drawing.points] as DashedLineDrawing['points'],
      dash: [...drawing.dash] as DashedLineDrawing['dash'],
    };
    return dashed;
  }

  const _exhaustive: never = drawing;
  return _exhaustive;
};

const cloneSnapshot = (snapshot: BoardSnapshot): BoardSnapshot => ({
  pitchType: snapshot.pitchType,
  players: snapshot.players.map((player) => ({ ...player })),
  ball: snapshot.ball ? { ...snapshot.ball } : null,
  drawings: snapshot.drawings.map(cloneDrawing),
});

const emptySnapshot = (pitchType: PitchType = 'seven'): BoardSnapshot => ({
  pitchType,
  players: [],
  ball: null,
  drawings: [],
});

export const initialState: AppState = {
  history: {
    past: [],
    present: emptySnapshot(),
    future: [],
  },
  ui: {
    selectedTool: 'move',
    draft: null,
    pitchRotation: 0,
  },
};

const commitSnapshot = (state: AppState, nextPresent: BoardSnapshot): AppState => ({
  history: {
    past: [...state.history.past, cloneSnapshot(state.history.present)],
    present: nextPresent,
    future: [],
  },
  ui: state.ui,
});

const nextPlayerNumber = (players: PlayerMarker[], team: Team): number | null => {
  const numbers = new Set(players.filter((player) => player.team === team).map((player) => player.number));

  for (let number = 1; number <= 11; number += 1) {
    if (!numbers.has(number)) {
      return number;
    }
  }

  return null;
};

const buildDraftDrawing = (draft: DraftDrawing): DrawingObject | null => {
  if (draft.kind === 'freehand') {
    return draft.points.length >= 4
      ? {
          id: createId(),
          kind: 'freehand',
          points: draft.points,
          color: '#ffffff',
          strokeWidth: 4,
        }
      : null;
  }

  const { start, current } = draft;
  const distance = Math.hypot(current.x - start.x, current.y - start.y);

  if (distance < 8) {
    return null;
  }

  if (draft.kind === 'arrow') {
    return {
      id: createId(),
      kind: 'arrow',
      points: [start.x, start.y, current.x, current.y],
      color: '#ffffff',
      strokeWidth: 5,
    };
  }

  return {
    id: createId(),
    kind: 'dashed',
    points: [start.x, start.y, current.x, current.y],
    color: '#ffffff',
    strokeWidth: 4,
    dash: [14, 10],
  };
};

export const reducer = (state: AppState, action: Action): AppState => {
  switch (action.type) {
    case 'set-tool':
      return {
        ...state,
        ui: {
          ...state.ui,
          selectedTool: action.tool,
          draft: null,
        },
      };
    case 'set-pitch-rotation':
      return {
        ...state,
        ui: {
          ...state.ui,
          pitchRotation: action.rotation,
        },
      };
    case 'set-pitch': {
      if (state.history.present.pitchType === action.pitchType) {
        return state;
      }

      const next = cloneSnapshot(state.history.present);
      next.pitchType = action.pitchType;
      return commitSnapshot(
        {
          ...state,
          ui: {
            ...state.ui,
            draft: null,
          },
        },
        next,
      );
    }
    case 'add-player': {
      const number = nextPlayerNumber(state.history.present.players, action.team);

      if (number === null) {
        return state;
      }

      const next = cloneSnapshot(state.history.present);
      next.players.push({
        id: createId(),
        kind: 'player',
        team: action.team,
        number,
        x: action.x,
        y: action.y,
      });

      return commitSnapshot(state, next);
    }
    case 'place-ball': {
      const next = cloneSnapshot(state.history.present);
      next.ball = next.ball
        ? {
            ...next.ball,
            x: action.x,
            y: action.y,
          }
        : {
            id: createId(),
            kind: 'ball',
            x: action.x,
            y: action.y,
          };

      const committed = commitSnapshot(state, next);
      return {
        ...committed,
        ui: {
          ...committed.ui,
          selectedTool: 'move',
        },
      };
    }
    case 'move-player': {
      const current = state.history.present.players.find((player) => player.id === action.id);
      if (!current || (current.x === action.x && current.y === action.y)) {
        return state;
      }

      const next = cloneSnapshot(state.history.present);
      next.players = next.players.map((player) =>
        player.id === action.id ? { ...player, x: action.x, y: action.y } : player,
      );
      return commitSnapshot(state, next);
    }
    case 'move-ball': {
      if (!state.history.present.ball) {
        return state;
      }

      const current = state.history.present.ball;
      if (current.id !== action.id || (current.x === action.x && current.y === action.y)) {
        return state;
      }

      const next = cloneSnapshot(state.history.present);
      next.ball = { ...next.ball!, x: action.x, y: action.y };
      return commitSnapshot(state, next);
    }
    case 'erase-object': {
      const next = cloneSnapshot(state.history.present);

      if (action.target.kind === 'player') {
        const player = next.players.find((item) => item.id === action.target.id);
        if (!player) {
          return state;
        }
        next.players = next.players.filter((item) => item.id !== action.target.id);
      } else if (action.target.kind === 'ball') {
        if (!next.ball || next.ball.id !== action.target.id) {
          return state;
        }
        next.ball = null;
      } else if (action.target.kind === 'drawing') {
        const exists = next.drawings.some((item) => item.id === action.target.id);
        if (!exists) {
          return state;
        }
        next.drawings = next.drawings.filter((item) => item.id !== action.target.id);
      } else {
        const _exhaustive: never = action.target;
        return _exhaustive;
      }

      return commitSnapshot(state, next);
    }
    case 'clear-all': {
      const current = state.history.present;
      if (!current.players.length && !current.drawings.length && !current.ball) {
        return state;
      }

      const committed = commitSnapshot(state, emptySnapshot(current.pitchType));
      return {
        ...committed,
        ui: {
          ...committed.ui,
          draft: null,
        },
      };
    }
    case 'undo': {
      if (!state.history.past.length) {
        return state;
      }

      const previous = state.history.past[state.history.past.length - 1];
      return {
        history: {
          past: state.history.past.slice(0, -1),
          present: previous,
          future: [cloneSnapshot(state.history.present), ...state.history.future],
        },
        ui: {
          ...state.ui,
          draft: null,
        },
      };
    }
    case 'redo': {
      if (!state.history.future.length) {
        return state;
      }

      const [nextFuture, ...remaining] = state.history.future;
      return {
        history: {
          past: [...state.history.past, cloneSnapshot(state.history.present)],
          present: nextFuture,
          future: remaining,
        },
        ui: {
          ...state.ui,
          draft: null,
        },
      };
    }
    case 'start-draft':
      return {
        ...state,
        ui: {
          ...state.ui,
          draft: action.draft,
        },
      };
    case 'update-draft': {
      if (!state.ui.draft) {
        return state;
      }

      if (state.ui.draft.kind === 'freehand') {
        return {
          ...state,
          ui: {
            ...state.ui,
            draft: {
              ...state.ui.draft,
              points: [...state.ui.draft.points, action.point.x, action.point.y],
            },
          },
        };
      }

      return {
        ...state,
        ui: {
          ...state.ui,
          draft: {
            ...state.ui.draft,
            current: action.point,
          },
        },
      };
    }
    case 'commit-draft': {
      if (!state.ui.draft) {
        return state;
      }

      const drawing = buildDraftDrawing(state.ui.draft);
      if (!drawing) {
        return {
          ...state,
          ui: {
            ...state.ui,
            draft: null,
          },
        };
      }

      const next = cloneSnapshot(state.history.present);
      next.drawings.push(drawing);
      const committed = commitSnapshot(state, next);
      return {
        ...committed,
        ui: {
          ...committed.ui,
          draft: null,
        },
      };
    }
    case 'cancel-draft':
      return {
        ...state,
        ui: {
          ...state.ui,
          draft: null,
        },
      };
    default:
      return state;
  }
};
