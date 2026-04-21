# ADR-0006: Progreso en vivo via evento IPC broadcast

## Estado
Aceptado - 2026-04

## Contexto
El cherry-pick de N commits puede tomar varios segundos o minutos (fetch + pull + N `cherry-pick`). El usuario necesita feedback en vivo: que paso esta corriendo, cual fue exitoso, cual fallo. Opciones:

1. Devolver el resultado completo al final y mostrar steps retroactivos.
2. Hacer polling desde el renderer.
3. Streaming via IPC.

## Decision
El proceso principal emite eventos `Progress` al renderer via `webContents.send(IPC.progress.event, payload)` a medida que avanza cada paso. El renderer se suscribe con `api.progress.subscribe(listener)` (retorna un unsubscribe). La mutacion `execute()` tambien retorna el resultado final con todos los `steps`.

## Alternativas consideradas
- **Retornar al final**: mala UX en operaciones largas; el usuario no sabe si se colgo.
- **Polling con `getStatus`**: mas RTTs y granularidad pobre.

## Consecuencias
- El renderer mantiene un buffer `progressEvents` para pintarlos en orden.
- Si la ventana se cierra durante una ejecucion, los eventos se pierden; el resultado final se mantiene en el historial.
- Cada payload de `Progress` es plano (fase, step, sha opcional, ok, error): facil de serializar y extender.
- El mismo canal se usa para `executeCherryPick` y `continueCherryPick`.
