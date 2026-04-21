import { registerReposHandlers } from './repos.handlers.js';
import { registerGitHandlers } from './git.handlers.js';
import { registerHistoryHandlers } from './history.handlers.js';
import { registerPreferencesHandlers } from './preferences.handlers.js';
import { registerSystemHandlers } from './system.handlers.js';
import { registerThemeHandlers } from './theme.handlers.js';

export function registerIpc(): void {
  registerReposHandlers();
  registerGitHandlers();
  registerHistoryHandlers();
  registerPreferencesHandlers();
  registerSystemHandlers();
  registerThemeHandlers();
}
