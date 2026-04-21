import Store from 'electron-store';
import type { Preferences } from '@shared/types.js';
import { getDefaultReposRoot } from '../utils/paths.js';

type Schema = { preferences: Preferences };

type LegacyPreferences = Partial<Preferences> & { clonesRoot?: string };

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
    reposRoot: getDefaultReposRoot(),
    autoFetch: true,
    defaultSinceDays: 30
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

/**
 * One-time migration: if the persisted preferences still have `clonesRoot`
 * from the previous scaffold, copy it into `reposRoot` (only if reposRoot
 * is missing) and drop `clonesRoot`.
 */
function migrate(raw: LegacyPreferences | undefined): Preferences {
  const base = defaults();
  if (!raw || typeof raw !== 'object') return base;
  const merged: Preferences = { ...base, ...raw } as Preferences;
  if (!('reposRoot' in raw) && typeof raw.clonesRoot === 'string' && raw.clonesRoot.trim()) {
    merged.reposRoot = raw.clonesRoot;
  }
  // Never expose legacy key on the returned object.
  delete (merged as Partial<LegacyPreferences>).clonesRoot;
  return merged;
}

export function getPreferences(): Preferences {
  const s = getStore();
  const current = s.get('preferences') as LegacyPreferences | undefined;
  return migrate(current);
}

export function setPreferences(partial: Partial<Preferences>): Preferences {
  const s = getStore();
  const current = getPreferences();
  const next: Preferences = { ...current, ...partial };
  s.set('preferences', next);
  return next;
}
