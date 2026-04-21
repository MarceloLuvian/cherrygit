# ADR-0005: Distribucion sin firma ni notarizacion de Apple

## Estado
Aceptado - 2026-04

## Contexto
La firma de codigo y notarizacion de Apple requieren una cuenta Apple Developer ($99 USD/ano) y configurar Apple ID, certificados y keychain en CI. El alcance del proyecto (uso interno en el programa de transicion POS Movil OXXO) no justifica ese costo operativo hoy.

## Decision
Los builds de `electron-builder` se generan **sin firmar** (`identity: null`, `hardenedRuntime: false`). El instalador es un `.dmg` universal para macOS 13+. El README incluye instrucciones de primera apertura con clic derecho / `xattr -dr com.apple.quarantine`.

## Alternativas consideradas
- **Firmar con Apple Developer ID**: costo + operacion. Queda como punto abierto para futuro si se distribuye mas ampliamente.
- **Distribuir via Mac App Store**: implica sandboxing estricto que incompatibiliza con la ejecucion de `git` y el acceso a carpetas de clones locales.

## Consecuencias
- Gatekeeper mostrara un aviso en la primera apertura; documentado en README.
- Actualizaciones via Sparkle no estan habilitadas (requieren firma). Se distribuye el `.dmg` manualmente por ahora.
- Si el programa decide firmar mas adelante, basta con: crear cert Apple Developer ID, setear `CSC_LINK` / `CSC_KEY_PASSWORD`, quitar `identity: null`, anadir `hardenedRuntime: true` y correr `notarytool submit`.
