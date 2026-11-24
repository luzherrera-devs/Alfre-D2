# Notas para trabajar en este repo

- Antes de dar algo por terminado, cumplir `DEFINITION_OF_DONE.md`. En especial: **no romper el
  comportamiento existente salvo que la historia lo pida explícitamente**.
- La app es un solo archivo: `web/index.html`. El APK (`android/`) lo empaqueta tal cual desde ahí.
- Prueba de regresión: `node tests/regresion.js` (usa Playwright + Chromium). Debe terminar con `OK`.
- Los issues se cargan con las plantillas de `.github/ISSUE_TEMPLATE/`. Un sprint = etiqueta `sprint-N`.
- Usuario final: paciente intubado, manos débiles, ve la app en una tele desde la cama y la maneja con el
  control remoto de un stick Android TV. Priorizar siempre lo que le afecta a él.
