# Definición de terminado (DoD)

Una historia o un bug se da por **terminado** solo si cumple todo esto:

## 1. No rompe lo que ya funcionaba
Nada de lo que funcionaba antes puede dejar de funcionar o cambiar de comportamiento,
**salvo que la historia pida ese cambio de forma explícita**. En ese caso, el issue dice qué
comportamiento cambia y el commit lo menciona.

Lo que hay que seguir cuidando:
- **Tele + control remoto**: navegación con flechas a todos los botones, OK elige al instante
  (rebote 400 ms), Atrás = Borrar y nunca cierra la app, foco inicial en la primera predicción,
  foco bien visible, flecha mantenida avanza como máximo 1 vez cada 250 ms.
- **Celular / tablet táctil** y **navegador con mouse**: todos los botones responden al toque/clic.
- **Navegador con teclado**: flechas, Enter y Backspace (= Atrás).
- **Voz**: HABLAR lee el mensaje (voz nativa en el APK, voz del navegador en la compu).
- **Lo aprendido** (palabras frecuentes guardadas en el dispositivo) se conserva al actualizar.

## 2. Pruebas
- Pasa la prueba automática de regresión: `node tests/regresion.js` (también corre sola en GitHub Actions).
- Si la historia agrega algo nuevo, la prueba se amplía para cubrirlo.
- El APK compila en GitHub Actions.

## 3. Documentación
- Si cambia cómo se usa la app, se actualiza el `README.md`.

## 4. Validación con la persona que usa la app
- El issue se cierra después de probarlo en el dispositivo real (stick de TV o celular, según corresponda),
  o queda anotado que falta esa prueba.
