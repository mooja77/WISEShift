import { create } from 'zustand';

interface UiState {
  sidebarOpen: boolean;
  isSaving: boolean;
  lastSaved: Date | null;
  saveError: string | null;
  toggleSidebar: () => void;
  setSaving: (saving: boolean) => void;
  setLastSaved: (date: Date) => void;
  setSaveError: (error: string | null) => void;
}

export const useUiStore = create<UiState>()((set) => ({
  sidebarOpen: true,
  isSaving: false,
  lastSaved: null,
  saveError: null,
  toggleSidebar: () => set(state => ({ sidebarOpen: !state.sidebarOpen })),
  setSaving: (saving) => set({ isSaving: saving }),
  setLastSaved: (date) => set({ lastSaved: date, saveError: null }),
  setSaveError: (error) => set({ saveError: error }),
}));
