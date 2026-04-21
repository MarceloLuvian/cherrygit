export const IPC = {
  repos: {
    list: 'repos:list',
    refresh: 'repos:refresh',
    openInFinder: 'repos:openInFinder',
    getStatus: 'repos:getStatus'
  },
  git: {
    listBranches: 'git:listBranches',
    listCommits: 'git:listCommits',
    inspect: 'git:inspect',
    execute: 'git:execute',
    continue: 'git:continue',
    abort: 'git:abort'
  },
  history: {
    list: 'history:list',
    export: 'history:export'
  },
  preferences: {
    get: 'prefs:get',
    set: 'prefs:set'
  },
  system: {
    openInEditor: 'sys:openInEditor',
    openInTerminal: 'sys:openInTerminal',
    openInFinder: 'sys:openInFinder',
    newWindow: 'sys:newWindow',
    pickDirectory: 'sys:pickDirectory'
  },
  theme: {
    get: 'theme:get',
    set: 'theme:set',
    changed: 'theme:changed'
  },
  progress: {
    event: 'progress:event'
  }
} as const;
