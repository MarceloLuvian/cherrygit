import { BrowserWindow, nativeTheme } from 'electron';
import type { ThemeMode } from '@shared/types.js';
import { IPC } from '@shared/ipc-channels.js';
import { getPreferences, setPreferences } from './preferences.service.js';

export interface ThemeState {
  mode: ThemeMode;
  shouldUseDark: boolean;
}

export function initTheme(): void {
  const prefs = getPreferences();
  applyMode(prefs.theme);

  nativeTheme.on('updated', () => {
    const current = getPreferences().theme;
    if (current === 'system') {
      broadcast();
    }
  });
}

function applyMode(mode: ThemeMode): void {
  nativeTheme.themeSource = mode;
}

export function getTheme(): ThemeState {
  const mode = getPreferences().theme;
  return { mode, shouldUseDark: nativeTheme.shouldUseDarkColors };
}

export function setTheme(mode: ThemeMode): ThemeState {
  if (mode !== 'system' && mode !== 'light' && mode !== 'dark') {
    throw new Error(`Modo de tema invalido: ${mode}`);
  }
  setPreferences({ theme: mode });
  applyMode(mode);
  const state: ThemeState = { mode, shouldUseDark: nativeTheme.shouldUseDarkColors };
  broadcast(state);
  return state;
}

function broadcast(state?: ThemeState): void {
  const payload = state ?? getTheme();
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(IPC.theme.changed, payload);
  }
}
