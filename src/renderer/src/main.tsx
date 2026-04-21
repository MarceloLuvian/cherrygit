import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/globals.css';

/**
 * Bootstrap React + aplica tema inicial.
 *
 * El tema se maneja via IPC con el main process:
 *  - window.cherrygit.theme.get() -> estado inicial
 *  - window.cherrygit.theme.onChange(cb) -> suscripcion reactiva
 *
 * El store de tema (theme.store.ts) tambien puede aplicar la clase al <html>,
 * pero lo hacemos aqui antes de renderizar para evitar FOUC.
 */

async function bootstrapTheme(): Promise<void> {
  const root = document.documentElement;

  try {
    const api = window.cherrygit;
    if (!api?.theme) return;

    const initial = await api.theme.get();
    applyThemeClass(initial.shouldUseDark);

    api.theme.onChange((payload) => {
      applyThemeClass(payload.shouldUseDark);
    });
  } catch (err) {
    // Fallback: respetar prefers-color-scheme si IPC falla en dev
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyThemeClass(prefersDark);
    // eslint-disable-next-line no-console
    console.warn('[CherryGit] theme bootstrap fallback:', err);
  }

  function applyThemeClass(shouldUseDark: boolean): void {
    if (shouldUseDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }
}

void bootstrapTheme();

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element #root not found');
}

const root = createRoot(container);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
