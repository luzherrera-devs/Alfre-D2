package ar.comunicador.tv

import android.annotation.SuppressLint
import android.app.Activity
import android.graphics.Color
import android.os.Bundle
import android.speech.tts.TextToSpeech
import android.view.KeyEvent
import android.view.View
import android.view.WindowManager
import android.webkit.JavascriptInterface
import android.webkit.WebView
import android.webkit.WebViewClient
import java.util.Locale

/**
 * Comunicador para Android TV: una WebView a pantalla completa que carga la app desde assets.
 * - Las teclas del control remoto se mandan al JS con window.onRemoteKey(tecla, repetida).
 * - BACK nunca cierra la app: en el JS significa BORRAR.
 * - La voz usa el TextToSpeech nativo (la WebView no trae speechSynthesis), vía window.AndroidTTS.
 */
class MainActivity : Activity(), TextToSpeech.OnInitListener {

    private lateinit var web: WebView
    private var tts: TextToSpeech? = null
    private var ttsReady = false
    @Volatile private var ttsFailed = false
    private var pending: String? = null

    @SuppressLint("SetJavaScriptEnabled", "AddJavascriptInterface")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        hideSystemUi()

        tts = TextToSpeech(this, this)

        web = WebView(this).apply {
            setBackgroundColor(Color.BLACK)
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true          // guarda lo aprendido (localStorage)
            settings.mediaPlaybackRequiresUserGesture = false
            webViewClient = WebViewClient()            // nunca abrir un navegador externo
            isFocusable = true
            isFocusableInTouchMode = true
            addJavascriptInterface(TtsBridge(), "AndroidTTS")
        }
        setContentView(web)
        web.loadUrl("file:///android_asset/index.html")
        web.requestFocus()
    }

    // ---------- Control remoto ----------
    override fun dispatchKeyEvent(event: KeyEvent): Boolean {
        val key = when (event.keyCode) {
            KeyEvent.KEYCODE_DPAD_UP -> "up"
            KeyEvent.KEYCODE_DPAD_DOWN -> "down"
            KeyEvent.KEYCODE_DPAD_LEFT -> "left"
            KeyEvent.KEYCODE_DPAD_RIGHT -> "right"
            KeyEvent.KEYCODE_DPAD_CENTER,
            KeyEvent.KEYCODE_ENTER,
            KeyEvent.KEYCODE_NUMPAD_ENTER -> "ok"
            KeyEvent.KEYCODE_BACK,
            KeyEvent.KEYCODE_DEL -> "back"
            else -> null
        } ?: return super.dispatchKeyEvent(event)

        if (event.action == KeyEvent.ACTION_DOWN) {
            val repeat = event.repeatCount > 0
            web.evaluateJavascript("window.onRemoteKey && window.onRemoteKey('$key', $repeat);", null)
        }
        // Consumimos DOWN y UP: así BACK nunca llega al sistema y la app no se cierra.
        return true
    }

    @Deprecated("Deprecated in Java")
    @Suppress("MissingSuperCall")
    override fun onBackPressed() {
        // Nunca cerrar la app con Atrás (por si algún dispositivo lo manda por este camino).
        web.evaluateJavascript("window.onRemoteKey && window.onRemoteKey('back', false);", null)
    }

    // ---------- Voz ----------
    override fun onInit(status: Int) {
        val engine = tts
        if (status != TextToSpeech.SUCCESS || engine == null) {
            ttsFailed = true
            return
        }
        for (tag in listOf("es-AR", "es-ES", "es-US", "es")) {
            val r = engine.setLanguage(Locale.forLanguageTag(tag))
            if (r != TextToSpeech.LANG_MISSING_DATA && r != TextToSpeech.LANG_NOT_SUPPORTED) break
        }
        engine.setSpeechRate(0.9f)
        ttsReady = true
        pending?.let { speakNow(it) }
        pending = null
    }

    private fun speakNow(text: String) {
        tts?.speak(text, TextToSpeech.QUEUE_FLUSH, null, "mensaje")
    }

    inner class TtsBridge {
        /** Devuelve false si no hay ningún motor de voz disponible. */
        @JavascriptInterface
        fun speak(text: String): Boolean {
            if (ttsFailed) return false
            runOnUiThread {
                if (ttsReady) speakNow(text) else pending = text   // si todavía inicia, habla apenas esté lista
            }
            return true
        }

        @JavascriptInterface
        fun stop() {
            runOnUiThread {
                pending = null
                tts?.stop()
            }
        }
    }

    // ---------- Ciclo de vida ----------
    override fun onResume() {
        super.onResume()
        hideSystemUi()
        web.onResume()
    }

    override fun onPause() {
        web.onPause()
        super.onPause()
    }

    override fun onDestroy() {
        tts?.shutdown()
        tts = null
        web.destroy()
        super.onDestroy()
    }

    @Suppress("DEPRECATION")
    private fun hideSystemUi() {
        window.decorView.systemUiVisibility = (View.SYSTEM_UI_FLAG_FULLSCREEN
            or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            or View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
            or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN)
    }
}
