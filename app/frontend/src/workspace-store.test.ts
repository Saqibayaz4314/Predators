import { beforeEach, expect, it } from 'vitest';
import { useWorkspace } from './workspace-store';
const point = { nodeId: '1', snappedPoint: { longitude: 68.8, latitude: 27.7 }, snapDistanceMeters: 0, datasetVersion: 'v1' };
beforeEach(() => { useWorkspace.getState().clear(); useWorkspace.getState().selectScenario('baseline'); });
it('clears requested routes when endpoints change', () => {
  const state = useWorkspace.getState(); state.setPoint('origin', point); state.setPoint('destination', point); state.calculate();
  expect(useWorkspace.getState().requested).toBe(true);
  state.selectPoint('origin'); expect(useWorkspace.getState().requested).toBe(false);
  state.setPoint('origin', { ...point, nodeId: '2' }); expect(useWorkspace.getState().requested).toBe(false);
});
it('preserves endpoints during scenario switches for contextual recalculation', () => {
  const state = useWorkspace.getState(); state.setPoint('origin', point); state.setPoint('destination', point); state.calculate(); state.selectScenario('scenario');
  expect(useWorkspace.getState()).toMatchObject({ origin: point, destination: point, scenarioId: 'scenario', requested: true });
});
