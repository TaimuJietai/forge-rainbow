package com.forge.rainbow2

import android.content.Context
import android.webkit.WebView
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature
import java.io.BufferedReader
import java.io.InputStreamReader

object RainbowInjector {
    private const val SDK_ASSET = "sdk/web-view-host.min.js"
    private const val PLATFORM = "android"

    fun install(webView: WebView, context: Context) {
        webView.addJavascriptInterface(
            WebViewHostBridge(webView, PLATFORM),
            WebViewHostBridge.JS_NAME,
        )

        val script = buildScript(context)
        if (script == null) {
            android.util.Log.e("rainbow", "host asset missing: $SDK_ASSET")
            return
        }
        if (WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) {
            WebViewCompat.addDocumentStartJavaScript(webView, script, setOf("*"))
            android.util.Log.i("rainbow", "injected web-view-host via DOCUMENT_START_SCRIPT")
        } else {
            webView.tag = script
            android.util.Log.i("rainbow", "DOCUMENT_START_SCRIPT unsupported; using onPageStarted fallback")
        }
    }

    fun injectFallbackIfNeeded(webView: WebView) {
        val script = webView.tag as? String ?: return
        webView.evaluateJavascript(script, null)
    }

    private fun buildScript(context: Context): String? {
        val sdk = readAsset(context, SDK_ASSET) ?: return null
        val boot = "window.__WVH_BOOT__={platform:'$PLATFORM'};"
        return boot + "\n" + sdk
    }

    private fun readAsset(context: Context, path: String): String? {
        return try {
            context.assets.open(path).use { stream ->
                BufferedReader(InputStreamReader(stream, Charsets.UTF_8)).readText()
            }
        } catch (_: Exception) {
            null
        }
    }
}
