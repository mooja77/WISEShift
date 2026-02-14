import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type ResearchTab = 'explorer' | 'heatmap' | 'quotes';

interface ResearchState {
  dashboardCode: string | null;
  authenticated: boolean;
  activeTab: ResearchTab;

  setAuth: (code: string) => void;
  clearAuth: () => void;
  setActiveTab: (tab: ResearchTab) => void;
}

export const useResearchStore = create<ResearchState>()(
  persist(
    (set) => ({
      dashboardCode: null,
      authenticated: false,
      activeTab: 'explorer',

      setAuth: (code) => set({ dashboardCode: code, authenticated: true }),
      clearAuth: () => set({ dashboardCode: null, authenticated: false }),
      setActiveTab: (tab) => set({ activeTab: tab }),
    }),
    { name: 'wiseshift-research' }
  )
);
