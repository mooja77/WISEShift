import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type ResearchTab =
  | 'explorer'
  | 'heatmap'
  | 'cooccurrence'
  | 'quotes'
  | 'comparison'
  | 'statistics'
  | 'sampling'
  | 'irr'
  | 'trends'
  | 'matrix'
  | 'longitudinal'
  | 'wordcloud'
  | 'queries'
  | 'layers'
  | 'memos'
  | 'conceptmap'
  | 'exports';

interface ResearchState {
  dashboardCode: string | null;
  authenticated: boolean;
  activeTab: ResearchTab;
  activeCodingLayerId: string | null;

  explorerSearchTerm: string | null;

  setAuth: (code: string) => void;
  clearAuth: () => void;
  setActiveTab: (tab: ResearchTab) => void;
  setActiveCodingLayerId: (id: string | null) => void;
  searchInExplorer: (term: string) => void;
}

export const useResearchStore = create<ResearchState>()(
  persist(
    (set) => ({
      dashboardCode: null,
      authenticated: false,
      activeTab: 'explorer',
      activeCodingLayerId: null,
      explorerSearchTerm: null,

      setAuth: (code) => set({ dashboardCode: code, authenticated: true }),
      clearAuth: () => set({ dashboardCode: null, authenticated: false }),
      setActiveTab: (tab) => set({ activeTab: tab }),
      setActiveCodingLayerId: (id) => set({ activeCodingLayerId: id }),
      searchInExplorer: (term) => set({ activeTab: 'explorer', explorerSearchTerm: term }),
    }),
    { name: 'wiseshift-research' }
  )
);
