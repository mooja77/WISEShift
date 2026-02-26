import { describe, it, expect, beforeEach } from 'vitest';
import { useResearchStore } from '@/stores/researchStore';

describe('researchStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    const { clearAuth } = useResearchStore.getState();
    clearAuth();
    useResearchStore.setState({
      activeTab: 'explorer',
      activeCodingLayerId: null,
      explorerSearchTerm: null,
    });
  });

  it('initial state has authenticated: false', () => {
    const state = useResearchStore.getState();
    expect(state.authenticated).toBe(false);
    expect(state.dashboardCode).toBeNull();
  });

  it('setAuth sets dashboardCode and authenticated', () => {
    const { setAuth } = useResearchStore.getState();
    setAuth('DASH-TESTCODE');

    const state = useResearchStore.getState();
    expect(state.dashboardCode).toBe('DASH-TESTCODE');
    expect(state.authenticated).toBe(true);
  });

  it('clearAuth resets state', () => {
    const { setAuth, clearAuth } = useResearchStore.getState();

    // First authenticate
    setAuth('DASH-TESTCODE');
    expect(useResearchStore.getState().authenticated).toBe(true);

    // Then clear
    clearAuth();
    const state = useResearchStore.getState();
    expect(state.dashboardCode).toBeNull();
    expect(state.authenticated).toBe(false);
  });

  it('setActiveTab changes tab', () => {
    const { setActiveTab } = useResearchStore.getState();

    expect(useResearchStore.getState().activeTab).toBe('explorer');

    setActiveTab('heatmap');
    expect(useResearchStore.getState().activeTab).toBe('heatmap');

    setActiveTab('exports');
    expect(useResearchStore.getState().activeTab).toBe('exports');
  });

  it('setActiveCodingLayerId updates the layer id', () => {
    const { setActiveCodingLayerId } = useResearchStore.getState();

    expect(useResearchStore.getState().activeCodingLayerId).toBeNull();

    setActiveCodingLayerId('layer-123');
    expect(useResearchStore.getState().activeCodingLayerId).toBe('layer-123');

    setActiveCodingLayerId(null);
    expect(useResearchStore.getState().activeCodingLayerId).toBeNull();
  });

  it('searchInExplorer sets active tab to explorer and sets search term', () => {
    const { setActiveTab, searchInExplorer } = useResearchStore.getState();

    // Switch away from explorer first
    setActiveTab('heatmap');
    expect(useResearchStore.getState().activeTab).toBe('heatmap');

    // Search should switch back to explorer
    searchInExplorer('leadership');
    const state = useResearchStore.getState();
    expect(state.activeTab).toBe('explorer');
    expect(state.explorerSearchTerm).toBe('leadership');
  });
});
