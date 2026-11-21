/**
 * 与 H5 rainbow / WebViewHost 信封对齐的小程序侧工具。
 * 信封：{ action, param, callbackKey }
 */

export type RainbowEnvelope = {
  action?: string
  param?: unknown
  callbackKey?: string
}

export type RainbowBridgeHandlers = {
  /** 未匹配到专用 handler 时的兜底 */
  onUnknown?: (envelope: RainbowEnvelope) => void
  /** 按 action 名注册 */
  [action: string]: ((envelope: RainbowEnvelope) => void) | undefined
}

const PLATFORM_QUERY = 'rainbow_platform'

/** 给 web-view src 追加 platform boot */
export function appendRainbowBoot(url: string, platform = 'wechat'): string {
  return upsertQuery(url, { [PLATFORM_QUERY]: platform })
}

/**
 * 小程序 → H5：改 src 模拟 __fire。
 * 会触发 web-view 重新加载（微信限制）。
 */
export function appendRainbowEvent(
  url: string,
  event: string,
  data?: unknown,
  eventId?: string,
): string {
  const payload: Record<string, string> = {
    rainbow_event: event,
    rainbow_event_id: eventId || String(Date.now()),
  }
  if (data !== undefined) {
    payload.rainbow_event_data = JSON.stringify(data)
  }
  return upsertQuery(url, payload)
}

/**
 * 小程序 → H5：改 src 回 RPC（对应 webViewHost.__callback）。
 * 会触发 web-view 重新加载。
 */
export function appendRainbowCallback(
  url: string,
  callbackKey: string,
  result: { msg?: string; code?: number; data?: unknown },
  eventId?: string,
): string {
  return upsertQuery(url, {
    rainbow_callback: callbackKey,
    rainbow_result: JSON.stringify(result || {}),
    rainbow_event_id: eventId || String(Date.now()),
  })
}

/** 规范化 bindmessage 里的 data 列表为信封数组 */
export function normalizeMessageList(raw: unknown): RainbowEnvelope[] {
  if (!Array.isArray(raw)) {
    return []
  }
  const out: RainbowEnvelope[] = []
  for (const item of raw) {
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      out.push(item as RainbowEnvelope)
      continue
    }
    // 兼容误传：整段 JSON 字符串
    if (typeof item === 'string') {
      try {
        const parsed = JSON.parse(item)
        if (parsed && typeof parsed === 'object') {
          out.push(parsed as RainbowEnvelope)
        }
      } catch {
        // ignore
      }
    }
  }
  return out
}

/**
 * 分发 H5 → 小程序消息。
 * 即时导航类建议 H5 直接调 wx.miniProgram.*；此处主要处理 postMessage 队列。
 */
export function dispatchWebViewMessages(
  rawList: unknown,
  handlers: RainbowBridgeHandlers = {},
): RainbowEnvelope[] {
  const list = normalizeMessageList(rawList)
  for (const envelope of list) {
    const action = envelope.action ? String(envelope.action) : ''
    const specific = action && handlers[action]
    if (typeof specific === 'function') {
      specific(envelope)
      continue
    }
    if (typeof handlers.onUnknown === 'function') {
      handlers.onUnknown(envelope)
    } else {
      console.log('[rainbow] web-view message', envelope)
    }
  }
  return list
}

function upsertQuery(url: string, params: Record<string, string>): string {
  const hashIndex = url.indexOf('#')
  const withoutHash = hashIndex >= 0 ? url.slice(0, hashIndex) : url
  const hash = hashIndex >= 0 ? url.slice(hashIndex) : ''

  const qIndex = withoutHash.indexOf('?')
  const base = qIndex >= 0 ? withoutHash.slice(0, qIndex) : withoutHash
  const search = qIndex >= 0 ? withoutHash.slice(qIndex + 1) : ''

  const map: Record<string, string> = {}
  if (search) {
    for (const part of search.split('&')) {
      if (!part) continue
      const eq = part.indexOf('=')
      const k = decodeURIComponent(eq >= 0 ? part.slice(0, eq) : part)
      const v = decodeURIComponent(eq >= 0 ? part.slice(eq + 1) : '')
      if (k) map[k] = v
    }
  }

  for (const key of Object.keys(params)) {
    map[key] = params[key]
  }

  const keys = Object.keys(map)
  if (keys.length === 0) {
    return withoutHash + hash
  }

  const query = keys
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(map[k])}`)
    .join('&')

  return `${base}?${query}${hash}`
}
