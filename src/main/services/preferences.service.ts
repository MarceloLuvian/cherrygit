import Store from 'electron-store';
import type { Preferences } from '@shared/types.js';
import { getReposDir } from '../utils/paths.js';

type Schema = { preferences: Preferences };

let store: Store<Schema> | null = null;

function defaults(): Preferences {
  return {
    theme: 'system',
    editor: 'vscode',
    terminal: 'iterm',
    useX: true,
    cherryPickDryRunFirst: false,
    confirmBeforeExecute: true,
    notificationsEnabled: true,
    clonesRoot: getReposDir()
  };
}

function getStore(): Store<Schema> {
  if (!store) {
    store = new Store<Schema>({
      name: 'preferences',
      defaults: { preferences: defaults() }
    });
  }
  return store;
}

export function getPreferences(): Preferences {
  const s = getStore();
  const current = (s.get('preferences') as Preferences | undefined) ?? defaults();
  // Backfill any missing keys after upgrades.
  const merged: Preferences = { ...defaults(), ...current };
  return merged;
}

export function setPreferences(partial: Partial<Preferences>): Preferences {
  const s = getStore();
  const current = getPreferences();
  const next: Preferences = { ...current, ...partial };
  s.set('preferences', next);
  return next;
}
