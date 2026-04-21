import { create } from 'zustand';
import type { ThemeMode } from '@shared/types';
import { api } from '@renderer/lib/api';

interface ThemeState {
  mode: ThemeMode;
  shouldUseDark: boolean;
  initialized: boolean;
  unsubscribe: (() => void) | null;

  load: () => Promise<void>;
  set: (mode: ThemeMode) => Promise<void>;
}

function applyClass(shouldUseDark: boolean): void {
  const root = document.documentElement;
  if (shouldUseDark) root.classList.add('dark');
  else root.classList.remove('dark');
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: 'system',
  shouldUseDark: false,
  initialized: false,
  unsubscribe: null,

  load: async () => {
    // Idempotente: si ya cargamos y suscribimos, no hacer nada
    if (get().initialized) return;

    try {
      const initial = await api.theme.get();
      applyClass(initial.shouldUseDark);

      const unsub = api.theme.onChange((payload) => {
        applyClass(payload.shouldUseDark);
        set({ mode: payload.mode, shouldUseDark: payload.shouldUseDark });
      });

      set({
        mode: initial.mode,
        shouldUseDark: initial.shouldUseDark,
        initialized: true,
        unsubscribe: unsub
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[theme.store] load failed:', err);
      set({ initialized: true });
    }
  },

  set: async (mode: ThemeMode) => {
    try {
      const next = await api.theme.set(mode);
      applyClass(next.shouldUseDark);
      set({ mode: next.mode, shouldUseDark: next.shouldUseDark });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[theme.store] set failed:', err);
    }
  }
}));
