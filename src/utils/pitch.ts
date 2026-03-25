import { PitchType } from '../types';

export interface PitchGeometry {
  outerInset: number;
  centerCircleRadius: number;
  penaltyBoxDepth: number;
  penaltyBoxWidth: number;
  goalAreaDepth: number;
  goalAreaWidth: number;
  penaltyMarkOffset: number;
}

export const getPitchGeometry = (width: number, height: number, pitchType: PitchType): PitchGeometry => {
  const shortSide = Math.min(width, height);
  const baseInset = Math.max(18, shortSide * 0.035);

  if (pitchType === 'seven') {
    return {
      outerInset: baseInset,
      centerCircleRadius: shortSide * 0.075,
      penaltyBoxDepth: width * 0.12,
      penaltyBoxWidth: height * 0.42,
      goalAreaDepth: width * 0.055,
      goalAreaWidth: height * 0.2,
      penaltyMarkOffset: width * 0.08,
    };
  }

  return {
    outerInset: baseInset,
    centerCircleRadius: shortSide * 0.09,
    penaltyBoxDepth: width * 0.16,
    penaltyBoxWidth: height * 0.56,
    goalAreaDepth: width * 0.075,
    goalAreaWidth: height * 0.28,
    penaltyMarkOffset: width * 0.11,
  };
};
