package com.forge.rainbow2

import android.content.Context
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.URI

data class WebViewConfig(
    val url: String,
    val allowedHosts: Set<String>,
) {
    fun isHostAllowed(host: String?): Boolean {
        if (host.isNullOrBlank()) return false
        return allowedHosts.contains(host.lowercase())
    }

    companion object {
        private const val ASSET_PATH = "configuration/webview.json"
        private const val FALLBACK_URL = "https://dv.phb.plus/"
        private val FALLBACK_HOSTS = setOf("dv.phb.plus", "cdn.phb.plus")

        fun load(context: Context): WebViewConfig {
            return try {
                val json = context.assets.open(ASSET_PATH).use { stream ->
                    BufferedReader(InputStreamReader(stream, Charsets.UTF_8)).readText()
                }
                parse(json)
            } catch (_: Exception) {
                WebViewConfig(FALLBACK_URL, FALLBACK_HOSTS)
            }
        }

        internal fun parse(json: String): WebViewConfig {
            val root = JSONObject(json)
            val url = root.optString("url", FALLBACK_URL).ifBlank { FALLBACK_URL }
            val hosts = linkedSetOf<String>()
            val arr = root.optJSONArray("allowedHosts")
            if (arr != null) {
                for (i in 0 until arr.length()) {
                    val host = arr.optString(i).trim().lowercase()
                    if (host.isNotEmpty()) hosts.add(host)
                }
            }
            if (hosts.isEmpty()) {
                hosts.addAll(FALLBACK_HOSTS)
            }
            val urlHost = runCatching { URI(url).host?.lowercase() }.getOrNull()
            if (!urlHost.isNullOrBlank()) {
                hosts.add(urlHost)
            }
            return WebViewConfig(url = url, allowedHosts = hosts)
        }
    }
}
