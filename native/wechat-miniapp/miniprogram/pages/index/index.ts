const WEB_URL = 'https://dv.phb.plus/'

Page({
  data: {
    src: WEB_URL,
    failed: false,
    errorMsg: '',
  },

  onLoad() {
    console.log('[webview] open', WEB_URL)
    this.setData({ src: WEB_URL, failed: false, errorMsg: '' })
  },

  onWebLoad() {
    console.log('[webview] load ok', this.data.src)
    this.setData({ failed: false, errorMsg: '' })
  },

  onWebError(event: WechatMiniprogram.CustomEvent) {
    const detail = (event?.detail || {}) as Record<string, unknown>
    console.error('[webview] load error', detail)
    this.setData({
      failed: true,
      src: '',
      errorMsg: JSON.stringify(detail),
    })
  },
})
