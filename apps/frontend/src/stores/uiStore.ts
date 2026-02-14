import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UiState {
  sidebarOpen: boolean;
  mobileSidebarOpen: boolean;
  darkMode: boolean;
  isSaving: boolean;
  lastSaved: Date | null;
  saveError: string | null;
  toggleSidebar: () => void;
  toggleMobileSidebar: () => void;
  closeMobileSidebar: () => void;
  toggleDarkMode: () => void;
  setSaving: (saving: boolean) => void;
  setLastSaved: (date: Date) => void;
  setSaveError: (error: string | null) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      mobileSidebarOpen: false,
      darkMode: false,
      isSaving: false,
      lastSaved: null,
      saveError: null,
      toggleSidebar: () => set(state => ({ sidebarOpen: !state.sidebarOpen })),
      toggleMobileSidebar: () => set(state => ({ mobileSidebarOpen: !state.mobileSidebarOpen })),
      closeMobileSidebar: () => set({ mobileSidebarOpen: false }),
      toggleDarkMode: () =>
        set(state => {
          const next = !state.darkMode;
          if (next) {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
          return { darkMode: next };
        }),
      setSaving: (saving) => set({ isSaving: saving }),
      setLastSaved: (date) => set({ lastSaved: date, saveError: null }),
      setSaveError: (error) => set({ saveError: error }),
    }),
    {
      name: 'wiseshift-ui',
      partialize: (state) => ({ darkMode: state.darkMode }),
      onRehydrateStorage: () => (state) => {
        // Apply dark mode class on rehydration
        if (state?.darkMode) {
          document.documentElement.classList.add('dark');
        }
      },
    }
  )
);
