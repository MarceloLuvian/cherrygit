import { create } from 'zustand';
import type { Session } from '@shared/types';
import { api } from '@renderer/lib/api';

interface SessionState {
  session: Session | null;
  loading: boolean;
  initialized: boolean;
  error: string | null;

  loadSession: () => Promise<void>;
  login: (token: string) => Promise<Session>;
  logout: () => Promise<void>;
}

export const useSessionStore = create<SessionState>((set) => ({
  session: null,
  loading: false,
  initialized: false,
  error: null,

  loadSession: async () => {
    set({ loading: true, error: null });
    try {
      const s = await api.auth.getSession();
      set({ session: s, loading: false, initialized: true });
    } catch (err) {
      set({
        session: null,
        loading: false,
        initialized: true,
        error: err instanceof Error ? err.message : String(err)
      });
    }
  },

  login: async (token: string) => {
    set({ loading: true, error: null });
    try {
      const s = await api.auth.login(token);
      set({ session: s, loading: false, initialized: true });
      return s;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ loading: false, error: msg });
      throw err;
    }
  },

  logout: async () => {
    set({ loading: true, error: null });
    try {
      await api.auth.logout();
      set({ session: null, loading: false });
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : String(err)
      });
    }
  }
}));
