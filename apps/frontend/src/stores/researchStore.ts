import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type ResearchTab =
  | 'explorer'
  | 'heatmap'
  | 'quotes'
  | 'comparison'
  | 'statistics'
  | 'sampling'
  | 'irr'
  | 'trends'
  | 'layers'
  | 'exports';

interface ResearchState {
  dashboardCode: string | null;
  authenticated: boolean;
  activeTab: ResearchTab;
  activeCodingLayerId: string | null;

  setAuth: (code: string) => void;
  clearAuth: () => void;
  setActiveTab: (tab: ResearchTab) => void;
  setActiveCodingLayerId: (id: string | null) => void;
}

export const useResearchStore = create<ResearchState>()(
  persist(
    (set) => ({
      dashboardCode: null,
      authenticated: false,
      activeTab: 'explorer',
      activeCodingLayerId: null,

      setAuth: (code) => set({ dashboardCode: code, authenticated: true }),
      clearAuth: () => set({ dashboardCode: null, authenticated: false }),
      setActiveTab: (tab) => set({ activeTab: tab }),
      setActiveCodingLayerId: (id) => set({ activeCodingLayerId: id }),
    }),
    { name: 'wiseshift-research' }
  )
);
