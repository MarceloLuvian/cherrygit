# Backlog: CherryGit (app macOS nativa)

> Versión 1 del backlog. Basado en `kb-web/docs/cherry-pick/requerimientos-app-mac.md` y en el estado actual del scaffold de `AppCherryGit/`.

## Resumen del proyecto

- **Tipo:** Desktop app (macOS 13+, Apple Silicon + Intel).
- **Usuario objetivo:** Marcelo (Consiss) + equipo Consiss que opera POS Movil. Nivel técnico: senior, conocen git.
- **Stack:** Electron 31 + React 18 + TypeScript + Tailwind + electron-vite + zustand + @tanstack/react-query (ya scaffoldeado en `AppCherryGit/`).
- **Plataforma:** macOS Ventura o superior. Sin Windows/Linux.
- **Alcance:** Producto v1 (RF-01 a RF-10 y RNF-01 a RNF-06 del doc de requerimientos, completo).
- **Deadline:** Sin fecha fija. Arrancar ya.
- **Distribución:** `.app` / `.dmg` **sin firmar** (interno, primera apertura requiere "clic derecho → Abrir"). Firma/notarización Apple Developer queda fuera de v1.
- **Decisiones tomadas:**
  - Pivotar `AppCherryGit` (no arrancar proyecto limpio): reutilizar infra Electron/React/Tailwind, tirar login/GitHub API/clone remoto, reemplazar con lógica de repos locales basada en `kb-web/server/cherry-pick.mjs`.
  - Reutilizar el helper Node de kb-web portándolo al proceso main de Electron (mismo código, IPC como transporte).
  - Sin firma Apple Developer en v1.
  - Todas las funcionalidades (RF-01..RF-10) van en v1 — no hay MVP por fases.

---

## Épicas

### E0 — Pivote de AppCherryGit (limpieza + rebase sobre repos locales)
> Tirar todo lo que no aplica (GitHub API, token, login, clone) y dejar el cascarón listo para el nuevo dominio.

| ID | Historia | Prioridad | Points | Sprint |
|---|---|---|---|---|
| US-000 | Como dev, quiero eliminar el flujo de login con PAT y el `session.store` para que la app abra directo a la vista principal, sin auth | Must | 3 | 1 |
| US-001 | Como dev, quiero eliminar el servicio de GitHub API (octokit), el store `repos`, el flujo de clone y todas sus vistas/IPC, para que sólo quede infraestructura genérica (window, preload, router, stores de theme/prefs) | Must | 5 | 1 |
| US-002 | Como dev, quiero redefinir los tipos compartidos en `@shared/types` (Repo local, Branch, Commit, CommitDetail, CherryPickResult, ConflictState, HistoryEntry, Preferences) para que todo el renderer y main hablen el mismo contrato | Must | 3 | 1 |
| US-003 | Como dev, quiero portar `kb-web/server/cherry-pick.mjs` al proceso main como módulo `src/main/services/git/` (funciones `listRepos`, `listBranches`, `listCommitsInRange`, `inspectCommits`, `executeCherryPick`, `continueCherryPick`, `abortCherryPick`), exponiendo cada una vía IPC handler | Must | 5 | 1 |
| US-004 | Como dev, quiero configurar la carpeta base de repos desde store de preferencias (persistido en `electron-store` o JSON en userData) con default `~/OXXO/POS Móvil transición/OXXO_PROJECTs/`, para que `listRepos` la lea de ahí | Must | 3 | 1 |

**Criterios de aceptación US-000:**
- [ ] `routes/login/` eliminado; `session.store` eliminado; al arrancar la app, la ruta inicial es la lista de repos.
- [ ] Sin referencias a `keytar` ni a "Personal Access Token" en el código.
- [ ] El build (`npm run build`) pasa sin errores TS.

**Criterios de aceptación US-001:**
- [ ] Eliminados: `octokit`, `routes/repos` viejo, `api.repos.*`, IPC handlers de repos remotos, cualquier fetch a `api.github.com`.
- [ ] `package.json` sin dependencias de GitHub API ni keytar.
- [ ] `grep -r "octokit\|keytar\|api.github.com" src/` retorna vacío.

**Criterios de aceptación US-002:**
- [ ] `@shared/types/index.ts` contiene interfaces para todas las entidades del dominio.
- [ ] Los nombres siguen el doc de requerimientos (RF-01..RF-10).
- [ ] Ningún `any` en el contrato entre main y renderer.

**Criterios de aceptación US-003:**
- [ ] Funciones exportadas en `src/main/services/git/index.ts` con la misma firma que el prototipo kb-web.
- [ ] IPC handlers en `src/main/ipc/git.ts` con validación de argumentos (SHA regex, rutas resueltas server-side).
- [ ] `preload/index.ts` expone `window.cherrygit.git.*` tipado en `@shared/types/ipc.ts`.
- [ ] Smoke test: desde DevTools, `await window.cherrygit.git.listRepos()` devuelve el array de repos reales.

**Criterios de aceptación US-004:**
- [ ] `preferences.store` persistido en `<userData>/preferences.json`.
- [ ] Si la ruta no existe, `listRepos` devuelve `[]` sin crashear y el renderer muestra CTA "Configurar carpeta de repos".
- [ ] Cambios de carpeta en runtime disparan re-descubrimiento automático.

---

### E1 — Descubrimiento y selección de repositorio (RF-01)
> Listar repos locales en la carpeta base, mostrar nombre y rama actual.

| ID | Historia | Prioridad | Points | Sprint |
|---|---|---|---|---|
| US-010 | Como usuario, quiero ver la lista de repos detectados en mi carpeta base para elegir uno | Must | 3 | 1 |
| US-011 | Como usuario, quiero ver la rama actual (HEAD) junto al nombre del repo, para saber dónde estoy parado | Should | 2 | 2 |
| US-012 | Como usuario, quiero refrescar manualmente la lista de repos cuando agregue un clon nuevo, sin reiniciar la app | Should | 2 | 2 |

**Criterios de aceptación US-010:**
- [ ] Al abrir la app se lista ordenada alfabéticamente la subcarpeta de cada `.git`.
- [ ] Si no hay repos, muestra estado vacío con CTA a Preferencias.
- [ ] Click en un repo navega a la vista de cherry-pick de ese repo.

---

### E2 — Selección de ramas origen y destino (RF-02)
> Elegir source branch y target branch con fetch previo opcional.

| ID | Historia | Prioridad | Points | Sprint |
|---|---|---|---|---|
| US-020 | Como usuario, quiero seleccionar una rama origen y una rama destino en selectores separados, con locales y remotas agrupadas | Must | 3 | 2 |
| US-021 | Como usuario, quiero que la app ejecute `git fetch --all --prune` antes de listar ramas, con un toggle para desactivarlo cuando no tenga red | Must | 2 | 2 |
| US-022 | Como usuario, quiero que el selector de rama origen preseleccione la rama actual (HEAD) al cargar el repo | Should | 1 | 2 |
| US-023 | Como usuario, quiero filtrar las ramas remotas a sólo `origin/*` (vía preferencia), para no ver ruido de otros remotes | Could | 2 | 3 |

**Criterios de aceptación US-020:**
- [ ] Dos selectores (origen, destino) con optgroups Locales / Remotos.
- [ ] Se bloquea la sección de commits hasta que hay origen, destino y fecha desde.
- [ ] Indicador visual de la rama actual con badge "actual".

---

### E3 — Filtro por rango de fechas y listado de commits (RF-03, RF-04)
> Date pickers + listado cronológico ascendente con checkboxes y búsqueda.

| ID | Historia | Prioridad | Points | Sprint |
|---|---|---|---|---|
| US-030 | Como usuario, quiero date pickers "desde" (obligatorio) y "hasta" (opcional), con default 30 días atrás, para acotar el `git log` | Must | 2 | 2 |
| US-031 | Como usuario, quiero ver los commits del rango en orden cronológico ascendente (más viejo arriba) con shortSha, fecha, autor y subject, para que mi selección siga el orden de aplicación | Must | 3 | 2 |
| US-032 | Como usuario, quiero marcar/desmarcar commits con checkbox y ver en vivo un contador `N / M seleccionados` | Must | 2 | 2 |
| US-033 | Como usuario, quiero botones "Marcar todos" y "Desmarcar todos" para armar selecciones grandes rápido | Must | 1 | 2 |
| US-034 | Como usuario, quiero un campo de búsqueda in-memory que filtre la lista cargada por texto en subject o autor | Should | 3 | 3 |
| US-035 | Como usuario, quiero ver el SHA completo al hover sobre el shortSha, para copiarlo si lo necesito | Could | 1 | 3 |

**Criterios de aceptación US-031:**
- [ ] El listado usa el mismo formato `%H%x1f%h%x1f%an%x1f%ad%x1f%s --date=iso-strict --no-merges` del prototipo.
- [ ] `hasta` cubre hasta `23:59:59` del día seleccionado.
- [ ] Scroll virtual o paginación si hay >500 commits para no colgar la UI.
- [ ] Listar 30 días de un repo de <5000 commits tarda <2 s (RNF-04).

---

### E4 — Inspección detallada de commits (RF-05)
> Panel lateral o modal con metadata completa y lista de archivos modificados.

| ID | Historia | Prioridad | Points | Sprint |
|---|---|---|---|---|
| US-040 | Como usuario, quiero al hacer click sobre un commit ver un panel lateral con metadata (autor, fecha, subject, body completo) y lista de archivos modificados con indicador A/M/D | Must | 5 | 3 |
| US-041 | Como usuario, quiero ver el conteo total de archivos modificados por cada commit, para estimar el impacto antes de aplicar | Must | 1 | 3 |
| US-042 | Como usuario, quiero poder copiar el SHA completo desde el panel de inspección con un clic | Should | 1 | 3 |

**Criterios de aceptación US-040:**
- [ ] Panel lateral fijo (drawer) que se abre al click en un commit, no se solapa con la lista.
- [ ] Usa la función `inspectCommits` ya portada del prototipo.
- [ ] Indicadores A/M/D codificados por color + icono.
- [ ] Cierra con `Esc` o click fuera.

---

### E5 — Ejecución del cherry-pick (RF-06)
> Confirmación + orquestación working-tree-clean → fetch → checkout → pull --ff-only → loop de cherry-pick.

| ID | Historia | Prioridad | Points | Sprint |
|---|---|---|---|---|
| US-050 | Como usuario, quiero un botón "Ejecutar cherry-pick" que se habilita sólo si hay commits seleccionados y rama destino | Must | 1 | 3 |
| US-051 | Como usuario, quiero un modal de confirmación que muestre N commits → rama destino → repo, con la lista ordenada de SHAs a aplicar y toggle `-x` (default activo) | Must | 3 | 3 |
| US-052 | Como usuario, quiero que la app aborte con mensaje claro si el working tree no está limpio, mostrando la lista de archivos sucios, sin ejecutar ningún git mutador | Must | 2 | 3 |
| US-053 | Como usuario, quiero ver el progreso paso a paso (fetch / checkout / pull / cherry-pick por SHA) con indicadores OK/ERR en vivo, sin que la UI se congele | Must | 5 | 3 |
| US-054 | Como usuario, quiero que el botón de ejecutar muestre un estado "Ejecutando..." mientras corre y no deje disparar dos ejecuciones en paralelo | Must | 2 | 3 |

**Criterios de aceptación US-053:**
- [ ] Main emite eventos `cherrypick:progress` por IPC al renderer por cada paso.
- [ ] La lista de pasos muestra spinner en el paso en curso, checkmark en los completados, X en errores.
- [ ] Si falla `pull --ff-only` (divergencia), aborta con mensaje explicativo y no ejecuta cherry-pick.

---

### E6 — Manejo de conflictos (RF-07)
> Detener ante conflicto, mostrar progreso parcial, ofrecer Abrir terminal / editor / Continuar / Abortar.

| ID | Historia | Prioridad | Points | Sprint |
|---|---|---|---|---|
| US-060 | Como usuario, cuando un cherry-pick falla por conflicto quiero ver cuál SHA falló, cuáles se aplicaron antes (con su nuevo SHA), cuáles quedan pendientes y el path del repo | Must | 3 | 4 |
| US-061 | Como usuario, quiero un botón "Abrir en terminal" que lance Terminal.app/iTerm/Warp (según preferencia) con `cwd` en el repo en conflicto | Must | 3 | 4 |
| US-062 | Como usuario, quiero un botón "Abrir en editor" que abra el repo en VS Code / Cursor / WebStorm / Sublime (según preferencia) | Must | 3 | 4 |
| US-063 | Como usuario, tras resolver manualmente y stagear, quiero un botón "Continuar" que ejecute `git cherry-pick --continue` y aplique los pendientes; debe validar que no queden archivos con conflict markers sin resolver antes de correr | Must | 5 | 4 |
| US-064 | Como usuario, quiero un botón "Abortar" que ejecute `git cherry-pick --abort` sólo cuando yo lo pido explícitamente (nunca automático) | Must | 2 | 4 |
| US-065 | Como usuario, quiero que si el segundo de cuatro commits falla, la UI muestre claramente: 1 aplicado ok, 1 en conflicto, 2 pendientes, y los botones correctos | Must | 2 | 4 |

**Criterios de aceptación US-061:**
- [ ] Terminal por defecto configurable en Preferencias (Terminal.app, iTerm2, Warp).
- [ ] Usa `open -a <App> <path>` vía `execFile`, sin shell.
- [ ] Si la app configurada no está instalada, muestra error con opción a cambiar preferencia.

**Criterios de aceptación US-063:**
- [ ] Reutiliza `continueCherryPick` del prototipo (ya detecta `CHERRY_PICK_HEAD` y valida markers).
- [ ] Si hay archivos con conflict markers sin stagear, muestra error claro y no ejecuta.
- [ ] Al terminar, transiciona a la vista de resultado exitoso de E7.

---

### E7 — Resultado exitoso y resumen copiable (RF-08)
> Tabla SHA original → nuevo SHA → subject, mensaje claro de "no se hace push", botón copiar resumen.

| ID | Historia | Prioridad | Points | Sprint |
|---|---|---|---|---|
| US-070 | Como usuario, quiero ver al terminar un resumen con N commits aplicados en rama destino / repo, y una tabla original → nuevo → subject | Must | 3 | 4 |
| US-071 | Como usuario, quiero un banner que me recuerde que la app no hace push automático y que soy yo el que debo empujar cuando valide | Must | 1 | 4 |
| US-072 | Como usuario, quiero un botón "Copiar resumen" que pegue en portapapeles un texto formateado apto para PR/ticket (markdown con SHAs y subjects) | Must | 2 | 4 |

**Criterios de aceptación US-072:**
- [ ] Formato del resumen: título, repo, rama destino, lista markdown de `- origSha → newSha subject`.
- [ ] Usa `navigator.clipboard.writeText` y muestra toast "Copiado".

---

### E8 — Historial persistente de operaciones (RF-09)
> Log local en `~/Library/Application Support/CherryGit/history.json` + vista.

| ID | Historia | Prioridad | Points | Sprint |
|---|---|---|---|---|
| US-080 | Como dev, quiero que cada cherry-pick (ok o con conflicto) se persista en un JSON en `app.getPath('userData')/history.json` con timestamp, repo, ramas, SHAs originales, SHAs nuevos y resultado | Must | 3 | 5 |
| US-081 | Como usuario, quiero una vista "Historial" accesible desde el menú principal que liste mis ejecuciones previas ordenadas por fecha descendente | Must | 5 | 5 |
| US-082 | Como usuario, quiero poder filtrar el historial por repo y por rama destino, para buscar una ejecución específica | Should | 3 | 5 |
| US-083 | Como usuario, quiero poder expandir una entrada del historial y ver el detalle completo (pasos, resultados por commit, mensaje de error si hubo) | Should | 3 | 5 |
| US-084 | Como usuario, quiero copiar el resumen markdown de una entrada pasada (mismo formato que E7) | Could | 1 | 5 |

**Criterios de aceptación US-080:**
- [ ] Escritura atómica (archivo temporal + rename) para no corromper el JSON si la app crashea.
- [ ] Límite de 500 entradas; al exceder, rota eliminando las más viejas.

---

### E9 — Preferencias (RF-10)
> Carpeta base, editor, terminal, defaults de rango, toggle `-x`, toggle fetch automático.

| ID | Historia | Prioridad | Points | Sprint |
|---|---|---|---|---|
| US-090 | Como usuario, quiero una vista de Preferencias con campos: carpeta base (con file picker), editor por defecto (dropdown), terminal por defecto (dropdown), rango de fechas default (numérico días), `-x` por default (toggle), fetch automático (toggle) | Must | 5 | 5 |
| US-091 | Como usuario, quiero que los cambios de preferencias se persistan inmediatamente y se reflejen en la siguiente acción sin reiniciar | Must | 2 | 5 |
| US-092 | Como usuario, quiero validación del campo "carpeta base": debe existir, debe ser legible. Si no, mostrar error inline | Must | 2 | 5 |
| US-093 | Como usuario, quiero abrir Preferencias con `Cmd+,` (atajo estándar macOS) | Should | 1 | 6 |

**Criterios de aceptación US-090:**
- [ ] File picker usa `dialog.showOpenDialog({ properties: ['openDirectory'] })`.
- [ ] Dropdown editor incluye: VS Code, Cursor, WebStorm, Sublime Text, "Custom (comando)".
- [ ] Dropdown terminal incluye: Terminal.app, iTerm2, Warp, "Custom".

---

### E10 — UX nativa macOS (RNF-05)
> Atajos de teclado, notificaciones nativas, dark/light mode automático.

| ID | Historia | Prioridad | Points | Sprint |
|---|---|---|---|---|
| US-100 | Como usuario, quiero atajos de teclado: `Cmd+R` recargar commits, `Cmd+A` marcar todos (en la lista), `Cmd+Shift+A` desmarcar todos, `Cmd+Enter` ejecutar cherry-pick, `Esc` cerrar modal/panel | Must | 5 | 6 |
| US-101 | Como usuario, quiero recibir una notificación nativa del sistema al terminar un cherry-pick (éxito o conflicto) si la ventana no está en foco | Must | 3 | 6 |
| US-102 | Como usuario, quiero que la app siga el tema del sistema (dark/light) automáticamente, sin tener que tocarlo | Must | 2 | 6 |
| US-103 | Como usuario, quiero un menú nativo de la app con entradas CherryGit → Preferencias, Archivo → Recargar, Ventana → Minimizar, Ayuda | Should | 3 | 6 |
| US-104 | Como usuario, quiero que la TopBar deje espacio para los "traffic lights" de macOS (cuadrante superior izquierdo ~80 px) y no se solape con el contenido | Must | 1 | 6 |

**Criterios de aceptación US-100:**
- [ ] Atajos registrados vía `Menu` nativa con `accelerator`, no listeners globales.
- [ ] No chocan con atajos del sistema ni del input focuseado (ej. `Cmd+A` en un textarea escribe en el textarea, no marca commits).

---

### E11 — Observabilidad: logs y comandos equivalentes (RNF-06)
> Log en archivo + opción "Copiar comando equivalente" por cada paso.

| ID | Historia | Prioridad | Points | Sprint |
|---|---|---|---|---|
| US-110 | Como dev, quiero que el main escriba un log rotativo en `~/Library/Logs/CherryGit/app.log` con timestamp + comando git + exit code + stderr resumido, para poder debuggear fallas en campo | Must | 5 | 6 |
| US-111 | Como usuario, quiero un ícono junto a cada paso ejecutado que al hacer click copia el comando `git` equivalente (`git -C <repo> fetch --all --prune`, etc.) | Must | 3 | 6 |
| US-112 | Como dev, quiero un item de menú "Abrir carpeta de logs" que abra `~/Library/Logs/CherryGit/` en Finder | Should | 1 | 6 |

**Criterios de aceptación US-110:**
- [ ] Rotación diaria o por tamaño (~10 MB).
- [ ] Los tokens/secrets nunca aparecen en logs (aplica poco aquí, pero dejar la regla).

---

### E12 — Empaquetado y distribución (RNF-01)
> Producir `.app` y `.dmg` para macOS 13+ universal (arm64 + x64), sin firma.

| ID | Historia | Prioridad | Points | Sprint |
|---|---|---|---|---|
| US-120 | Como dev, quiero configurar `electron-builder` para producir un `.dmg` universal (Apple Silicon + Intel) con `productName: CherryGit`, ícono, min macOS 13 | Must | 5 | 7 |
| US-121 | Como dev, quiero un script `npm run package` que genere el `.dmg` y lo deposite en `dist/` | Must | 2 | 7 |
| US-122 | Como dev, quiero documentar en `README.md` cómo instalar la `.app` sin firmar en macOS (clic derecho → Abrir la primera vez, System Settings → Privacy & Security) | Must | 2 | 7 |
| US-123 | Como dev, quiero un script `npm run icons` que regenere `icon.icns` / `icon.png` / tray a partir de `resources/icon.svg` | Must | 2 | 7 |
| US-124 | Como dev, quiero validar que al abrir la `.app` en una Mac limpia (sin Node instalado) todo funcione: listar repos, listar branches, ejecutar cherry-pick real | Must | 5 | 7 |

**Criterios de aceptación US-120:**
- [ ] `build.mac.category = 'public.app-category.developer-tools'`.
- [ ] `build.mac.target = ['dmg']` universal.
- [ ] `productName: CherryGit` en Info.plist (ya no aparece "Electron" en la menu bar).

---

### E13 — Documentación del proyecto
> README, ADRs de las decisiones clave.

| ID | Historia | Prioridad | Points | Sprint |
|---|---|---|---|---|
| US-130 | Como dev, quiero un `README.md` con qué es CherryGit, quién la usa, cómo correr en dev, cómo hacer build, troubleshooting (app sin firma) | Must | 2 | 7 |
| US-131 | Como dev, quiero ADRs en `docs/adr/` para: 1) Electron sobre Tauri/SwiftUI, 2) reutilización del helper kb-web, 3) sin firma en v1, 4) carpeta base configurable, 5) historial en userData | Should | 3 | 7 |
| US-132 | Como dev, quiero un `LICENSE` (MIT o propietario Consiss — a definir) | Should | 1 | 7 |

---

## Resumen de prioridades MoSCoW

| Prioridad | Historias | Points totales |
|---|---|---|
| Must | US-000..004, 010, 020, 021, 030..033, 040, 041, 050..054, 060..065, 070..072, 080, 081, 090..092, 100..102, 104, 110, 111, 120..124, 130 | ~117 |
| Should | US-011, 012, 022, 042, 082, 083, 093, 103, 112, 131, 132 | ~23 |
| Could | US-023, 035, 084 | 4 |
| Won't (v1) | Push automático, crear PRs, resolver conflictos en la app, cross-repo, multi-usuario, cloud, stash/rebase, integración Jira/Linear, auto-update, telemetría | — |

## Estimación total

~144 story points. A una velocidad conservadora de 20 points/sprint (1 dev), cae en ~7 sprints. Se puede paralelizar: backend (main/IPC) + frontend (React) avanzan en paralelo de E3 en adelante.

## Plan de sprints sugerido

- **Sprint 1** — E0 (pivote) + E1 (descubrimiento de repos). 22 pts.
- **Sprint 2** — E2 (branches) + E3 (commits y fechas). 18 pts.
- **Sprint 3** — E4 (inspección) + E5 (ejecución). 20 pts.
- **Sprint 4** — E6 (conflictos) + E7 (resultado). 23 pts.
- **Sprint 5** — E8 (historial) + E9 (preferencias). 25 pts.
- **Sprint 6** — E10 (UX nativa) + E11 (observabilidad). 24 pts.
- **Sprint 7** — E12 (packaging) + E13 (docs). 15 pts.

## Riesgos y dependencias

- **R-01** El pivote (E0) es pre-requisito de todo; si se hace a medias queda código muerto de GitHub API.
- **R-02** La `.app` sin firmar puede bloquearse por Gatekeeper en Macs con políticas estrictas. Documentar workaround en README (US-122).
- **R-03** El atajo `Cmd+A` dentro de inputs debe respetar el browser default; implementarlo sólo cuando el foco esté en la lista de commits.
- **R-04** Portar el helper de kb-web no debe cambiar la semántica: los mismos argumentos a git deben producir el mismo resultado. Validar con un repo real antes de seguir.
- **R-05** Rendimiento: la UI no debe congelarse con 5000 commits. Si se detecta, agregar virtualización (`react-virtual` o similar) sin esperar a v2.

## Agentes recomendados

- `/architect` — **Sí.** Para firmar el diseño del IPC, el particionado main/renderer y la forma de los eventos de progreso.
- `/dev-backend` — **Sí.** Porta el helper de kb-web al proceso main, IPC handlers, persistencia de historial y preferencias, integración con `open -a` para editor/terminal.
- `/dev-frontend` — **Sí.** Vistas React (Repos, CherryPick, Preferences, History), componentes (CommitList, CommitDetailPanel, ConflictPanel, ProgressList), stores zustand.
- `/qa-engineer` — **Sí.** Validar criterios de aceptación sobre un repo real de `OXXO_PROJECTs/`, armar casos de conflicto a propósito, verificar atajos en Mac.
- `/pm-status` — **Opcional.** Como sos el único dev y PO, podés correrlo sólo al cierre de cada sprint para consolidar avance.

## Referencias

- Requerimientos: `kb-web/docs/cherry-pick/requerimientos-app-mac.md`.
- Prototipo web reutilizable: `kb-web/server/cherry-pick.mjs` + `kb-web/src/pages/cherry-pick.astro`.
- Repo GitHub: `https://github.com/MarceloLuvian/cherrygit` (rama `main`).
- Carpeta de repos locales default: `~/OXXO/POS Móvil transición/OXXO_PROJECTs/`.
