package com.forge.rainbow2

import android.annotation.SuppressLint
import android.app.Activity
import android.graphics.Color
import android.os.Build
import android.os.Bundle
import android.view.View
import android.view.WindowManager
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.ProgressBar

class MainActivity : Activity() {
    private lateinit var webView: WebView
    private var coverOverlay: FrameLayout? = null
    private var logoView: ImageView? = null
    private var loadingIndicator: ProgressBar? = null
    private var didShowLoading = false
    private var didDismissCover = false

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        applyFullscreen()
        setContentView(R.layout.activity_main)
        window.setBackgroundDrawableResource(R.color.splash_background)

        coverOverlay = findViewById(R.id.cover_overlay)
        logoView = findViewById(R.id.logo_view)
        loadingIndicator = findViewById(R.id.loading_indicator)

        webView = findViewById(R.id.webview)
        webView.setBackgroundColor(Color.TRANSPARENT)
        webView.webChromeClient = WebChromeClient()
        webView.webViewClient = object : WebViewClient() {
            override fun onPageCommitVisible(view: WebView?, url: String?) {
                // 首份 HTML 已可见：启动页切到 Loading，继续挡住未完成页面
                showLoadingIfNeeded()
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                // 整页加载完成后再关闭遮罩
                dismissCoverIfNeeded()
            }
        }
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccess = true
            allowContentAccess = true
            mixedContentMode = WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE
            cacheMode = WebSettings.LOAD_DEFAULT
        }

        webView.loadUrl(WEB_URL)
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) {
            applyFullscreen()
        }
    }

    override fun onDestroy() {
        webView.destroy()
        super.onDestroy()
    }

    private fun applyFullscreen() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            window.attributes = window.attributes.apply {
                layoutInDisplayCutoutMode =
                    WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES
            }
        }

        @Suppress("DEPRECATION")
        window.decorView.systemUiVisibility = (
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_FULLSCREEN
            )
    }

    private fun showLoadingIfNeeded() {
        if (didShowLoading || didDismissCover || coverOverlay == null) {
            return
        }
        didShowLoading = true

        val logo = logoView
        val loading = loadingIndicator
        loading?.visibility = View.VISIBLE
        logo?.animate()?.alpha(0f)?.setDuration(250)?.start()
        loading?.animate()?.alpha(1f)?.setDuration(250)?.start()
    }

    private fun dismissCoverIfNeeded() {
        val cover = coverOverlay
        if (didDismissCover || cover == null) {
            return
        }
        didDismissCover = true

        cover.animate()
            .alpha(0f)
            .setDuration(OVERLAY_FADE_MS)
            .withEndAction {
                cover.visibility = View.GONE
                loadingIndicator = null
                logoView = null
                coverOverlay = null
            }
            .start()
    }

    companion object {
        private const val WEB_URL = "https://dv.phb.plus/"
        private const val OVERLAY_FADE_MS = 350L
    }
}
