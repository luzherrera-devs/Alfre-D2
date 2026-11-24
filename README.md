# Comunicador predictivo para Android TV

Comunicador de texto a voz para un paciente que no puede hablar. Se ve en una tele y se maneja con el
**control remoto** de un stick Android TV / Google TV (cruz de dirección + OK + Atrás). También sigue
funcionando con toque y con mouse.

```
web/index.html      ← la app (un solo archivo, sin internet). Es la única copia.
android/            ← envoltorio Android TV (Kotlin, WebView + voz nativa)
.github/workflows/  ← compila el APK automáticamente en GitHub
```

## Cómo se usa con el control

| Control             | Teclado (navegador) | Qué hace                                                        |
|---------------------|---------------------|-----------------------------------------------------------------|
| ▲ ▼ ◀ ▶             | Flechas             | Mueve el foco al botón más cercano en esa dirección (máx. 1 cada 250 ms si se mantiene apretada) |
| OK                  | Enter               | Elige al instante. Un segundo OK a menos de 400 ms se ignora     |
| Atrás               | Backspace           | **Borrar**: quita lo último que se agregó (letra, palabra o frase). También deshace "Borrar todo". Con el mensaje en grande abierto, lo cierra sin borrar |
| —                   | Escape              | Cierra el mensaje en grande                                     |

- Al arrancar, el foco está en la primera predicción (o en la primera letra si no hay).
- Después de elegir una letra, el foco va a la letra más probable siguiente.
- **HABLAR** (arriba) lee el mensaje completo. Poner el foco sobre el mensaje y apretar OK también habla.
- **BORRAR** en pantalla hace lo mismo que Atrás. **TODO** borra todo, pero pide confirmación con un segundo OK.

## Probar en la compu

Abrí `web/index.html` en Chrome o Edge y usá las flechas, Enter y Backspace. La voz usa la del navegador.

## Conseguir el APK

### Opción A: GitHub Actions (sin instalar nada)

Cada push compila el APK. En GitHub: **Actions → APK Android TV → la última ejecución → Artifacts →
`comunicador-tv-apk`**. Se baja un `.zip` con `app-debug.apk` adentro.

### Opción B: en tu compu

1. Instalá [Android Studio](https://developer.android.com/studio) (trae el SDK y Java 17).
2. Abrí la carpeta `android/` con Android Studio y esperá a que termine de sincronizar.
3. **Build → Build App Bundle(s) / APK(s) → Build APK(s)**, o desde una terminal en `android/`:
   ```
   ./gradlew assembleDebug          (en Windows: gradlew.bat assembleDebug)
   ```
4. El APK queda en `android/app/build/outputs/apk/debug/app-debug.apk`.

## Instalar en el stick por adb vía Wi-Fi

1. **Activar opciones de desarrollador** en el stick: *Configuración → Sistema → Acerca de → Compilación
   del SO de Android TV* y apretá OK 7 veces seguidas.
2. *Configuración → Sistema → Opciones de desarrollador*: activá **Depuración por USB** (y, si aparece,
   **Depuración inalámbrica / Depuración por red**).
3. Buscá la IP del stick: *Configuración → Red e Internet → (tu red Wi-Fi)*. Ej.: `192.168.0.45`.
   La compu tiene que estar en la **misma red Wi-Fi**.
4. Instalá las *platform-tools* de Android (vienen con Android Studio, o se bajan solas desde
   developer.android.com/tools/releases/platform-tools) para tener `adb`.
5. Conectá e instalá:
   ```
   adb connect 192.168.0.45:5555
   adb devices                         # tiene que aparecer como "device"
   adb install -r app-debug.apk
   ```
   La primera vez, en la tele aparece **"¿Permitir la depuración?"**: marcá *Permitir siempre* y OK.
   - En Google TV con Android 11+ que muestra "Depuración inalámbrica" con código de vinculación:
     `adb pair IP:PUERTO_DE_VINCULACION` (ingresá el código) y después `adb connect IP:PUERTO`
     usando el puerto que muestra esa misma pantalla.
6. La app aparece en el inicio como **Comunicador** (si no está en la fila de apps, buscala en
   *Apps → Ver todas*). Para abrirla desde la compu:
   ```
   adb shell am start -n ar.comunicador.tv/.MainActivity
   ```

### Voz en el stick

La app usa el motor de texto a voz del sistema, en español de Argentina (si no hay, español de España).
Si no habla: *Configuración → Sistema → Accesibilidad → Salida de texto a voz*. Verificá que esté
**Speech Services by Google** y descargá la voz en **Español**. Se puede probar desde ahí mismo
con "Escuchar un ejemplo".

### Notas

- El botón Atrás nunca cierra la app (solo borra). Para salir, usá el botón **Inicio** del control.
- La pantalla no se apaga mientras la app está abierta.
- Lo que la app aprende (palabras frecuentes) se guarda en el stick. Reinstalar con `adb install -r`
  lo conserva; desinstalar lo borra.

## Issues, sprints y definición de terminado

- Los problemas y las mejoras se cargan como **Issues** en GitHub, con las plantillas *Problema (bug)* o
  *Mejora (historia)*. Se pueden cargar desde el celular, con la app de GitHub, y adjuntar capturas.
- Cada sprint se marca con la etiqueta `sprint-N`.
- Nada se da por terminado si no cumple [`DEFINITION_OF_DONE.md`](DEFINITION_OF_DONE.md). Lo principal:
  **no romper lo que ya funcionaba, salvo que la historia lo pida explícitamente**.
- Prueba de regresión: `node tests/regresion.js` (también corre sola en GitHub Actions con cada cambio).
