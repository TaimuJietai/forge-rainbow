package com.forge.rainbow2

import android.os.Handler
import android.os.Looper
import android.webkit.JavascriptInterface
import android.webkit.WebView
import org.json.JSONObject
import java.net.URLDecoder

/**
 * 对齐 jssdk/src/api-names.js（及 Invoke 内置 ready/config）。
 * H5: webViewHost.invoke → kWHScriptHandlerName.postMessage(encodeURIComponent(JSON))
 * Native: 解析信封后 evaluate webViewHost.__callback(callbackKey, result)
 */
class WebViewHostBridge(
    private val webView: WebView,
    private val platform: String = "android",
) {
    private val mainHandler = Handler(Looper.getMainLooper())

    @JavascriptInterface
    fun postMessage(encoded: String?) {
        if (encoded.isNullOrBlank()) return
        mainHandler.post {
            dispatch(encoded)
        }
    }

    private fun dispatch(encoded: String) {
        try {
            val raw = URLDecoder.decode(encoded, "UTF-8")
            val envelope = JSONObject(raw)
            val action = envelope.optString("action", "")
            val callbackKey = envelope.optString("callbackKey", "")
            if (callbackKey.isEmpty()) {
                android.util.Log.w(TAG, "missing callbackKey for action=$action")
                return
            }
            val result = handleAction(action)
            reply(callbackKey, result)
        } catch (e: Exception) {
            android.util.Log.e(TAG, "dispatch failed", e)
        }
    }

    private fun handleAction(action: String): JSONObject {
        return when (action) {
            "ready" -> ok(action, JSONObject().put("platform", platform))
            "ping" -> ok(
                action,
                JSONObject()
                    .put("platform", platform)
                    .put("ts", System.currentTimeMillis()),
            )
            "config" -> ok(action, JSONObject())
            else -> JSONObject()
                .put("msg", "Unknown action: $action")
                .put("code", 40401)
                .put("data", JSONObject().put("action", action))
        }
    }

    private fun ok(action: String, data: JSONObject): JSONObject {
        return JSONObject()
            .put("msg", "$action::ok")
            .put("code", 0)
            .put("data", data)
    }

    private fun reply(callbackKey: String, result: JSONObject) {
        val keyLit = JSONObject.quote(callbackKey)
        val script =
            "window.webViewHost&&webViewHost.__callback($keyLit,$result);"
        webView.evaluateJavascript(script, null)
    }

    companion object {
        private const val TAG = "WebViewHostBridge"
        const val JS_NAME = "kWHScriptHandlerName"
    }
}
