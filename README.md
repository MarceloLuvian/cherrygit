# CherryGit

Aplicacion nativa de macOS para hacer `cherry-pick` masivo entre ramas de repos git clonados localmente. Pensada para equipos que necesitan trasladar un set de commits de una rama a otra (por ejemplo `feature` a `qa` o `qa` a `master`) sin depender de la API de GitHub ni de scripts manuales.

## Caracteristicas

- Lista de repositorios detectados en una carpeta base configurable.
- Seleccion de rama origen y rama destino (locales y remotas) con `fetch` opcional.
- Filtrado de commits por rango de fechas y texto libre (subject o autor).
- Cherry-pick masivo en orden cronologico ascendente, con `-x` opcional.
- Progreso en vivo por paso (fetch, checkout, pull, cherry-pick).
- Manejo de conflictos: panel para abrir el repo en terminal / editor, continuar o abortar.
- Historial persistente de ejecuciones con filtros y export a JSON / CSV.
- Atajos de teclado: `Cmd+A` marcar todos, `Cmd+Shift+A` desmarcar, `Cmd+Enter` ejecutar.
- Logs locales en `~/Library/Logs/cherrygit/app.log`.

## Requisitos

- macOS 13.0 o superior (Ventura+). Funciona en Intel y Apple Silicon via binario universal.
- git instalado en el PATH del sistema.
- Tus repos clonados localmente (por ejemplo `~/OXXO/.../OXXO_PROJECTs`).

## Instalacion del .dmg sin firma

Los builds actuales **no estan firmados ni notarizados** (no hay Apple Developer ID). macOS mostrara un aviso de Gatekeeper la primera vez. Para instalarlo:

1. Abre el `.dmg` y arrastra `CherryGit.app` a `Applications`.
2. Abre Finder, ve a `Applications`, haz **clic derecho** sobre `CherryGit.app` y elige **Open**.
3. macOS avisara que la app no esta firmada. Pulsa **Open** en el dialogo.
4. Si aparece "app cannot be opened because the developer cannot be verified", ejecuta una sola vez:

   ```bash
   xattr -dr com.apple.quarantine /Applications/CherryGit.app
   ```

5. Vuelve a abrirla normalmente desde Launchpad.

A partir de ahi se abre con doble clic como cualquier app.

## Desarrollo

Stack: Electron 31 + React 18 + TypeScript + Tailwind 4 + electron-vite.

```bash
npm install
npm run dev         # app en modo desarrollo
npm run typecheck   # TypeScript
npm run lint
npm run test        # unit tests (vitest)
npm run test:e2e    # end-to-end (playwright)
```

Build y empaquetado:

```bash
npm run build            # compila main + preload + renderer
npm run package          # .dmg universal (Intel + Apple Silicon)
npm run package:arm64    # .dmg solo para Apple Silicon (mas rapido)
npm run package:dir      # genera .app sin empaquetarlo
```

El artefacto final queda en `dist/CherryGit-<version>-universal.dmg`.

## Estructura

```
src/
├── main/               # proceso principal de Electron
│   ├── ipc/            # handlers (git, repos, history, preferences, system, theme)
│   ├── services/       # git (branches, commits, cherry-pick), history, preferences, theme, notifications
│   ├── utils/          # logger (pino), paths (userData, logs)
│   └── windows/        # manager (BrowserWindow) y menu nativo
├── preload/            # contextBridge que expone window.cherrygit
├── renderer/src/       # UI React
│   ├── routes/         # repos, repo/:name, history, preferences
│   ├── components/     # layout (AppShell, Sidebar, TopBar), ui, feedback
│   └── stores/         # zustand (theme, preferences)
└── shared/             # tipos y canales IPC compartidos
docs/
├── backlog.md          # backlog priorizado (MoSCoW + Fibonacci)
├── architecture.md
└── adr/                # Architecture Decision Records
```

## Configuracion

La primera vez que abras la app, ve a **Preferencias** y ajusta:

- **Carpeta base de repos**: directorio que contiene tus clones locales (cada subcarpeta con `.git` se detecta como repo).
- **Editor externo** (VS Code / Cursor / Sublime / sistema): se usa desde el panel de conflicto.
- **Terminal** (iTerm2 / Terminal.app / Warp).
- **useX**: anade `git cherry-pick -x` por defecto (agrega referencia al commit original en el mensaje).
- **autoFetch**: ejecuta `fetch --all --prune` al listar ramas.

Las preferencias se guardan en `~/Library/Application Support/CherryGit/config.json`.

## Datos locales

CherryGit no envia nada a la red. Todo esta en tu maquina:

- Configuracion: `~/Library/Application Support/CherryGit/config.json`
- Historial: `~/Library/Application Support/CherryGit/history.jsonl`
- Logs: `~/Library/Logs/cherrygit/app.log`

No se usan credenciales de GitHub. La app opera sobre tus clones locales; si necesitas publicar los commits aplicados, haz `git push` manualmente (la app **no** hace push automatico).

## Licencia

Uso interno - ver [`LICENSE`](./LICENSE).
