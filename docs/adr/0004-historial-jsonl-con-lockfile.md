# ADR-0004: Historial persistente en JSONL con lockfile

## Estado
Aceptado - 2026-04

## Contexto
Queremos un registro persistente de cada cherry-pick ejecutado: timestamp, repo, ramas, SHAs originales y nuevos, resultado, duracion. Debe sobrevivir reinicios, permitir filtrado y export. Multiples ventanas de la misma app pueden escribir simultaneamente.

## Decision
Guardamos cada ejecucion como una linea JSON en `~/Library/Application Support/CherryGit/history.jsonl`. Las escrituras usan `proper-lockfile` para evitar colisiones entre ventanas / procesos. Al leer, cargamos solo las ultimas 500 lineas en memoria y aplicamos filtros en cliente.

## Alternativas consideradas
- **SQLite (better-sqlite3)**: overkill para el volumen esperado (<1000 entradas / dia) y agrega dependencia binaria con recompile por arch.
- **electron-store (JSON monolitico)**: cargar/reescribir todo el archivo por cada entrada no escala y es mas propenso a corrupcion.

## Consecuencias
- El archivo crece append-only; no hay rotacion automatica (se puede agregar despues si hace falta).
- `listEntries` siempre parsea un tail del archivo; aceptable para 500 entradas.
- Si queremos consultas complejas (agregados, joins) en el futuro, migrar a SQLite es viable pero por ahora no se justifica.
