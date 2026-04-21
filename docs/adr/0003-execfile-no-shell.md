# ADR-0003: Ejecutar git via `execFile`, nunca via shell

## Estado
Aceptado - 2026-04

## Contexto
Necesitamos invocar `git` desde el proceso principal de Electron con argumentos derivados de input del usuario (nombre de repo, ramas, rangos de fechas, SHAs). El uso de `exec` (con shell) o `spawn` con `{ shell: true }` abre la puerta a command injection si algun argumento contiene caracteres especiales.

## Decision
Toda invocacion de git usa `child_process.execFile('git', [args...])` (sin shell). Los argumentos se pasan siempre como array. Adicionalmente:

- Los nombres de repo se validan contra la lista de subcarpetas de `reposRoot` (allowlist).
- Los SHAs se validan con `/^[0-9a-f]{7,40}$/i` antes de pasarse a git.
- Las fechas se pasan como argumentos aislados (`--since`, `--until`).
- Las ramas se validan contra el listado real del repo antes de operar.

## Consecuencias
- No se puede depender de features de shell (pipes, redirecciones, expansion). Si se necesita, se compone en Node.
- El codigo es mas verboso pero mucho mas seguro.
- Cualquier helper nuevo que ejecute git debe pasar por el mismo patron (documentado en `src/main/services/git/`).
