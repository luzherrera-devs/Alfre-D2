# Notas para trabajar en este repo

- Antes de dar algo por terminado, cumplir `DEFINITION_OF_DONE.md`. En especial: **no romper el
  comportamiento existente salvo que la historia lo pida explícitamente**.
- **Desarrollo incremental por plataformas**: se van sumando plataformas (tele + control remoto, navegador,
  celular/tablet táctil, y las que vengan). Lo hecho para una plataforma no debe romperse al agregar otra:
  cada plataforma nueva se suma como adaptación aparte (p. ej. media queries o manejo de entrada propios),
  y las pruebas existentes de las otras plataformas no se tocan.
- La app es un solo archivo: `web/index.html`. El APK (`android/`) lo empaqueta tal cual desde ahí.
- Prueba de regresión: `node tests/regresion.js` (usa Playwright + Chromium). Debe terminar con `OK`.
- Los issues se cargan con las plantillas de `.github/ISSUE_TEMPLATE/`. Un sprint = etiqueta `sprint-N`.
- Usuario final: paciente intubado, manos débiles, ve la app en una tele desde la cama y la maneja con el
  control remoto de un stick Android TV. Priorizar siempre lo que le afecta a él.
