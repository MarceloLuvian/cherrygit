import { create } from 'zustand';
import type { Preferences } from '@shared/types';
import { api } from '@renderer/lib/api';

interface PreferencesState {
  prefs: Preferences | null;
  loading: boolean;
  error: string | null;

  load: () => Promise<void>;
  save: (partial: Partial<Preferences>) => Promise<void>;
}

export const usePreferencesStore = create<PreferencesState>((set, get) => ({
  prefs: null,
  loading: false,
  error: null,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const p = await api.preferences.get();
      set({ prefs: p, loading: false });
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : String(err)
      });
    }
  },

  save: async (partial) => {
    set({ loading: true, error: null });
    try {
      await api.preferences.set(partial);
      // Releer para tener el estado canonico desde main
      const fresh = await api.preferences.get();
      set({ prefs: fresh, loading: false });
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : String(err)
      });
      // propagar para que el caller pueda mostrar error
      throw err;
    }
    // useless return to avoid tree-shake warnings about unused `get`
    void get;
  }
}));
