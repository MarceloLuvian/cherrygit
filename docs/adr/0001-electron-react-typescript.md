# ADR-0001: Stack Electron + React + TypeScript

## Estado
Aceptado - 2026-04

## Contexto
Necesitamos una GUI nativa para macOS que opere sobre repos git locales, con UI rica (listas de commits, progreso en vivo, drawer de detalle, modales de confirmacion) y flujos interactivos. El equipo tiene experiencia en React y TypeScript y necesitamos poder iterar rapido sin escribir UI nativa con AppKit.

## Decision
Usamos Electron 31 + React 18 + TypeScript + Tailwind 4, orquestado con electron-vite. El proceso principal ejecuta las operaciones git via `execFile`. El proceso renderer es una SPA React conectada via `contextBridge`.

## Alternativas consideradas
- **Swift + SwiftUI nativo**: mejor UX/memoria pero mucho mas costo de implementacion y el equipo no tiene experiencia. Tambien dificulta reusar logica con el wizard existente en `kb-web`.
- **Tauri + React**: binario mas pequeno y mejor memoria, pero menos maduro en IPC, webview WKWebView con diferencias de comportamiento, y menos experiencia del equipo.
- **CLI pura**: descartada porque el requerimiento central es GUI (gestion visual de commits y conflictos).

## Consecuencias
- Binario mas grande (~200 MB universal) y mayor consumo de memoria que una app nativa.
- Posibilidad de reusar la logica de `kb-web/server/cherry-pick.mjs` portandola a TS.
- Acceso directo a APIs de Node (ejecutar git, leer filesystem, manejar paths de usuario).
- Debemos mantener la frontera proceso principal / renderer con contextBridge (sin `nodeIntegration`).
