import { create } from 'zustand';
import type { SnapResult } from '@flood/shared';

export type PointRole = 'origin' | 'destination';
export const useWorkspace = create<{
  scenarioId: string; origin: SnapResult | null; destination: SnapResult | null;
  selecting: PointRole | null; requested: boolean;
  selectScenario: (id: string) => void; selectPoint: (role: PointRole | null) => void;
  setPoint: (role: PointRole, point: SnapResult) => void; calculate: () => void; clear: () => void;
}>((set) => ({
  scenarioId: 'baseline', origin: null, destination: null, selecting: null, requested: false,
  selectScenario: (scenarioId) => set({ scenarioId }),
  selectPoint: (selecting) => set({ selecting, requested: false }),
  setPoint: (role, point) => set({ [role]: point, selecting: role === 'origin' ? 'destination' : null, requested: false }),
  calculate: () => set({ requested: true, selecting: null }),
  clear: () => set({ origin: null, destination: null, selecting: null, requested: false }),
}));
