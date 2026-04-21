export const IPC = {
  auth: {
    getSession: 'auth:getSession',
    login: 'auth:login',
    logout: 'auth:logout'
  },
  repos: {
    list: 'repos:list',
    clone: 'repos:clone',
    localClones: 'repos:localClones',
    openInFinder: 'repos:openInFinder'
  },
  git: {
    listBranches: 'git:listBranches',
    listCommits: 'git:listCommits',
    inspect: 'git:inspect',
    execute: 'git:execute',
    continue: 'git:continue',
    abort: 'git:abort',
    status: 'git:status'
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
    newWindow: 'sys:newWindow'
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
