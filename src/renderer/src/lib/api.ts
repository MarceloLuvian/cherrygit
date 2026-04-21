import type { CherryGitAPI } from '@shared/types';

/**
 * Acceso tipado a la API expuesta por el preload via contextBridge.
 * Todo el codigo del renderer debe usar esta constante, nunca `window.cherrygit`
 * directo, para facilitar el mocking en tests.
 */
export const api: CherryGitAPI = window.cherrygit;

/**
 * Hook trivial para mantener consistencia con patrones de hooks en React.
 * En el futuro puede envolver la API con telemetria, tracing, etc.
 */
export function useApi(): CherryGitAPI {
  return api;
}
