# ADR-0002: Operar sobre clones locales, sin GitHub API

## Estado
Aceptado - 2026-04

## Contexto
El equipo ya tiene clones locales de los microservicios de POS Movil. Una version inicial considerada usaba la API de GitHub con un Personal Access Token para listar commits y hacer cherry-pick a traves de refs/API de contenidos. Sin embargo:

- Los usuarios ya hacen `git pull`/`git fetch` regularmente; el clon local suele estar mas actualizado que lo que expone la API.
- Un cherry-pick real reproduce el comportamiento esperado por el flujo de PRs (mismos conflictos, mismo autor/committer, mismos hooks locales).
- La API de GitHub no soporta `cherry-pick` directamente; habria que hacer un `merge` o reescribir arboles, lo que abre edge-cases.
- Dependencia de red, rate limits y permisos adicionales.

## Decision
CherryGit opera exclusivamente sobre clones locales ubicados bajo una carpeta base configurable (`reposRoot`). Cada subcarpeta con `.git` se considera un repo. Todas las operaciones son `execFile('git', [...])` en el proceso principal.

## Alternativas consideradas
- **GitHub API con token**: descartada por complejidad del cherry-pick remoto, dependencia de red, y menos control sobre conflictos.
- **libgit2 via N-API**: mas portable que CLI pero complica conflictos (no re-usa los hooks del usuario) y agrega dependencia binaria.

## Consecuencias
- Los usuarios deben tener sus repos clonados y razonablemente actualizados.
- No se hace `git push` automatico: el usuario publica cuando y como quiera.
- El manejo de conflictos es el nativo de git: abrimos terminal/editor sobre el repo y esperamos `--continue` o `--abort`.
- Validamos SHAs con regex (`/^[0-9a-f]{7,40}$/i`) y restringimos los repos al `reposRoot` configurado para evitar path traversal.
