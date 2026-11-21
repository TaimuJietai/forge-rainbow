// 微信小程序不能 require .json，由 sync 脚本生成同内容的 webview.js
// eslint-disable-next-line @typescript-eslint/no-require-imports
const webviewConfig = require('../../configuration/webview.js') as {
  url?: string
  allowedHosts?: string[]
}

import {
  appendRainbowBoot,
  appendRainbowCallback,
  appendRainbowEvent,
  dispatchWebViewMessages,
  type RainbowEnvelope,
} from '../../utils/rainbow-bridge'

/**
 * 微信无法向 web-view 注入 JS：URL query 传 boot；
 * H5 用 wechat.js + jssdk；出站 postMessage；入站靠改 src。
 *
 * 注意：bindmessage 仅在后退/分享/销毁等时机触发，不是点按钮即时到达。
 * ready/ping 在 H5 侧用 getEnv 即时调通；此处处理延迟到达的信封。
 */
function loadHomeUrl(): string {
  const base =
    webviewConfig && typeof webviewConfig.url === 'string' && webviewConfig.url
      ? webviewConfig.url
      : 'https://dv.phb.plus/'

  return appendRainbowBoot(base, 'wechat')
}

Page({
  data: {
    url: loadHomeUrl(),
    showLoading: true,
    lastAction: '',
  },

  onWebLoad() {
    this.setData({ showLoading: false })
  },

  onWebError() {
    this.setData({ showLoading: false })
    wx.showToast({
      title: '页面加载失败',
      icon: 'none',
    })
  },

  onWebMessage(e: WechatMiniprogram.CustomEvent) {
    const list = (e.detail && (e.detail as { data?: unknown[] }).data) || []
    dispatchWebViewMessages(list, {
      ready: (envelope: RainbowEnvelope) => {
        console.log('[rainbow] ready (bindmessage)', envelope)
        this.setData({ lastAction: 'ready' })
      },
      ping: (envelope: RainbowEnvelope) => {
        console.log('[rainbow] ping (bindmessage)', envelope)
        this.setData({ lastAction: 'ping' })
        // 延迟到达时仍可改 src 回一包（页面会刷新）
        if (envelope.callbackKey) {
          this.replyCallback(envelope.callbackKey, {
            msg: 'ping::ok',
            code: 0,
            data: { platform: 'wechat', via: 'bindmessage' },
          })
        }
      },
      config: (envelope: RainbowEnvelope) => {
        console.log('[rainbow] config (bindmessage)', envelope)
        this.setData({ lastAction: 'config' })
      },
      toast: (envelope: RainbowEnvelope) => {
        const param = (envelope.param || {}) as { title?: string }
        wx.showToast({
          title: param.title || String(envelope.action || 'toast'),
          icon: 'none',
        })
      },
      onUnknown: (envelope: RainbowEnvelope) => {
        const action = envelope.action ? String(envelope.action) : '(empty)'
        console.log('[rainbow] web-view message', envelope)
        this.setData({ lastAction: action })
      },
    })
  },

  /** 小程序 → H5 事件推送（改 src，会刷新） */
  fireToH5(event: string, data?: unknown) {
    const next = appendRainbowEvent(this.data.url, event, data)
    this.setData({ url: next, showLoading: true })
  },

  /** 小程序 → H5 RPC 回包（改 src，会刷新） */
  replyCallback(
    callbackKey: string,
    result: { msg?: string; code?: number; data?: unknown },
  ) {
    const next = appendRainbowCallback(this.data.url, callbackKey, result)
    this.setData({ url: next, showLoading: true })
  },
})
