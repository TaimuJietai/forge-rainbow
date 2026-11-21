/**
 * 微信小程序 web-view 内使用的脚本（业务 H5 自行引入）。
 *
 * 官方要求：web-view 内使用 wx.miniProgram.* 需引入微信 JSSDK ≥ 1.3.2。
 * 普通浏览器（即使 URL 带 rainbow_platform=wechat）会立即失败，避免 getEnv 挂死无回包。
 */
import installWebViewHost from './web-view-host.js'

var JWEIXIN_SRC = 'https://res.wx.qq.com/open/js/jweixin-1.6.0.js'
var GET_ENV_TIMEOUT_MS = 2500
var jweixinLoading = null

function getUA() {
  return typeof navigator !== 'undefined' ? navigator.userAgent || '' : ''
}

/** 是否在微信客户端内（含小程序 web-view） */
function isWechatClient() {
  if (typeof window !== 'undefined' && window.WeixinJSBridge) {
    return true
  }
  return getUA().indexOf('MicroMessenger') !== -1
}

function getMiniProgram() {
  if (typeof wx === 'undefined' || !wx || !wx.miniProgram) {
    return null
  }
  // 浏览器加载 jweixin 后也可能有空对象；要求关键方法存在
  if (typeof wx.miniProgram.getEnv !== 'function') {
    return null
  }
  if (typeof wx.miniProgram.postMessage !== 'function') {
    return null
  }
  return wx.miniProgram
}

function loadJweixin(cb) {
  if (getMiniProgram()) {
    cb(null)
    return
  }
  if (typeof document === 'undefined') {
    cb(new Error('no document'))
    return
  }
  if (jweixinLoading) {
    jweixinLoading.push(cb)
    return
  }
  jweixinLoading = [cb]
  var existed = document.querySelector('script[data-rainbow-jweixin="1"]')
  if (existed) {
    var waitN = 0
    var waitT = setInterval(function () {
      waitN++
      if (getMiniProgram() || waitN > 40) {
        clearInterval(waitT)
        var queue = jweixinLoading || []
        jweixinLoading = null
        for (var i = 0; i < queue.length; i++) {
          queue[i](getMiniProgram() ? null : new Error('jweixin ready timeout'))
        }
      }
    }, 50)
    return
  }
  var s = document.createElement('script')
  s.src = JWEIXIN_SRC
  s.async = true
  s.setAttribute('data-rainbow-jweixin', '1')
  s.onload = function () {
    var queue = jweixinLoading || []
    jweixinLoading = null
    for (var i = 0; i < queue.length; i++) {
      queue[i](null)
    }
  }
  s.onerror = function () {
    var queue = jweixinLoading || []
    jweixinLoading = null
    for (var j = 0; j < queue.length; j++) {
      queue[j](new Error('jweixin load failed'))
    }
  }
  ;(document.head || document.documentElement).appendChild(s)
}

/**
 * @param {function(Error|null, object|null): void} cb
 */
function ensureMiniProgram(cb) {
  // 仅微信客户端内才继续；其它端应走 kWHScriptHandlerName，不应进这里
  if (!isWechatClient()) {
    cb(new Error('wx.miniProgram only works inside WeChat'), null)
    return
  }

  var mp = getMiniProgram()
  if (mp) {
    cb(null, mp)
    return
  }

  function finish() {
    var ready = getMiniProgram()
    if (ready) {
      cb(null, ready)
      return
    }
    loadJweixin(function (err) {
      if (err) {
        cb(err, null)
        return
      }
      var n = 0
      var t = setInterval(function () {
        n++
        var m = getMiniProgram()
        if (m || n > 40) {
          clearInterval(t)
          if (m) {
            cb(null, m)
          } else {
            cb(new Error('wx.miniProgram unavailable'), null)
          }
        }
      }, 50)
    })
  }

  if (typeof document === 'undefined') {
    cb(new Error('no document'), null)
    return
  }

  if (typeof window !== 'undefined' && window.WeixinJSBridge) {
    finish()
    return
  }

  var done = false
  function once() {
    if (done) return
    done = true
    document.removeEventListener('WeixinJSBridgeReady', once, false)
    finish()
  }
  document.addEventListener('WeixinJSBridgeReady', once, false)
  setTimeout(once, 300)
}

function readQueryMap() {
  var map = {}
  if (typeof window === 'undefined' || !window.location) {
    return map
  }
  try {
    var search = window.location.search || ''
    if (!search || search.charAt(0) !== '?') {
      return map
    }
    var parts = search.substring(1).split('&')
    for (var i = 0; i < parts.length; i++) {
      var pair = parts[i].split('=')
      var key = decodeURIComponent(pair[0] || '')
      if (!key) continue
      map[key] = decodeURIComponent(pair[1] || '')
    }
  } catch (e) {
    // ignore
  }
  return map
}

function parseJson(raw, fallback) {
  if (!raw) {
    return fallback
  }
  try {
    return JSON.parse(raw)
  } catch (e) {
    return fallback
  }
}

function readPlatformFromQuery() {
  var q = readQueryMap()
  return q.rainbow_platform || q.__rainbow_platform || ''
}

/**
 * @param {Window|object} global
 */
function installWechat(global) {
  if (!global) {
    return
  }

  var nativeBridge = global.kWHScriptHandlerName
  if (nativeBridge && typeof nativeBridge.postMessage === 'function') {
    if (!global.webViewHost) {
      installWebViewHost(global)
    }
    return
  }

  installWebViewHost(global)
  var host = global.webViewHost
  if (!host) {
    return
  }

  var fromQuery = readPlatformFromQuery()
  // 展示用：URL boot 可显示 wechat；真正能力仍看 isWechatClient + miniProgram
  if (isWechatClient() || fromQuery === 'wechat') {
    host.webViewEnv = fromQuery === 'wechat' || isWechatClient() ? 'wechat' : 'web'
    host.platform = fromQuery || (isWechatClient() ? 'wechat' : 'web')
  } else {
    host.webViewEnv = 'web'
    host.platform = fromQuery || 'web'
  }

  if (isWechatClient()) {
    ensureMiniProgram(function () {})
  }

  var lastFiredToken = ''
  var lastCallbackToken = ''

  function consumeInboundFromUrl() {
    var q = readQueryMap()

    var cbKey = q.rainbow_callback || ''
    if (cbKey) {
      var cbToken = cbKey + '|' + (q.rainbow_result || '') + '|' + (q.rainbow_event_id || '')
      if (cbToken !== lastCallbackToken) {
        lastCallbackToken = cbToken
        var result = parseJson(q.rainbow_result || '', {
          msg: 'Invalid rainbow_result',
          code: 40001,
          data: {},
        })
        host.__callback(cbKey, result)
      }
    }

    var action = q.rainbow_event || q.rainbow_fire || ''
    if (!action) {
      return
    }
    var token =
      String(q.rainbow_event_id || '') + '|' + action + '|' + (q.rainbow_event_data || '')
    if (token === lastFiredToken) {
      return
    }
    lastFiredToken = token
    host.__fire(action, parseJson(q.rainbow_event_data || '', {}))
  }

  function failNoBridge(action, callbackKey, detail) {
    host.__callback(callbackKey, {
      msg: detail || 'Illegal device: no native bridge',
      code: 10001,
      data: { action: action },
    })
  }

  function postToNativeBridge(fullParam) {
    var bridge = global.kWHScriptHandlerName
    if (bridge && typeof bridge.postMessage === 'function') {
      bridge.postMessage(encodeURIComponent(JSON.stringify(fullParam)))
      return true
    }
    return false
  }

  function replyAfterGetEnv(mp, action, fullParam, callbackKey) {
    if (!mp.getEnv) {
      failNoBridge(action, callbackKey, 'wx.miniProgram.getEnv missing')
      return
    }
    var settled = false
    var timer = setTimeout(function () {
      if (settled) return
      settled = true
      failNoBridge(
        action,
        callbackKey,
        'getEnv timeout (open inside WeChat mini-program web-view, not desktop browser)',
      )
    }, GET_ENV_TIMEOUT_MS)

    mp.getEnv(function (res) {
      if (settled) return
      settled = true
      clearTimeout(timer)
      if (!res || !res.miniprogram) {
        host.__callback(callbackKey, {
          msg: 'Not in wechat mini-program web-view',
          code: 10001,
          data: { action: action, env: res || {} },
        })
        return
      }
      try {
        mp.postMessage({ data: fullParam })
      } catch (e) {
        // ignore
      }
      host.__callback(callbackKey, {
        msg: action + '::ok',
        code: 0,
        data: {
          platform: 'wechat',
          miniprogram: true,
          ts: Date.now(),
        },
      })
    })
  }

  function dispatchWithMini(mp, fullParam) {
    var action = fullParam && fullParam.action ? String(fullParam.action) : ''
    var param = fullParam && fullParam.param != null ? fullParam.param : {}
    var callbackKey = fullParam && fullParam.callbackKey

    if (action === 'ready' || action === 'ping' || action === 'config') {
      replyAfterGetEnv(mp, action, fullParam, callbackKey)
      return
    }

    if (action === 'navigateBack') {
      try {
        mp.navigateBack(param)
        host.__callback(callbackKey, { msg: 'navigateBack::ok', code: 0, data: {} })
      } catch (e) {
        host.__callback(callbackKey, {
          msg: String(e && e.message ? e.message : e),
          code: 40001,
          data: {},
        })
      }
      return
    }

    if (
      action === 'navigateTo' ||
      action === 'redirectTo' ||
      action === 'reLaunch' ||
      action === 'switchTab'
    ) {
      var opts = {}
      if (param && typeof param === 'object') {
        for (var key in param) {
          if (Object.prototype.hasOwnProperty.call(param, key)) {
            opts[key] = param[key]
          }
        }
      }
      opts.success = function () {
        host.__callback(callbackKey, { msg: action + '::ok', code: 0, data: {} })
      }
      opts.fail = function (err) {
        host.__callback(callbackKey, {
          msg: (err && (err.errMsg || err.message)) || action + ' failed',
          code: 40001,
          data: {},
        })
      }
      try {
        mp[action](opts)
      } catch (e) {
        host.__callback(callbackKey, {
          msg: String(e && e.message ? e.message : e),
          code: 40001,
          data: {},
        })
      }
      return
    }

    if (action === 'getEnv') {
      var settledEnv = false
      var envTimer = setTimeout(function () {
        if (settledEnv) return
        settledEnv = true
        failNoBridge(action, callbackKey, 'getEnv timeout')
      }, GET_ENV_TIMEOUT_MS)
      mp.getEnv(function (res) {
        if (settledEnv) return
        settledEnv = true
        clearTimeout(envTimer)
        host.__callback(callbackKey, { msg: 'getEnv::ok', code: 0, data: res || {} })
      })
      return
    }

    try {
      mp.postMessage({ data: fullParam })
      host.__callback(callbackKey, {
        msg: action + '::queued',
        code: 10002,
        data: {
          queued: true,
          callbackKey: callbackKey,
          hint: 'wechat postMessage is deferred; use rainbow_callback URL to reply',
        },
      })
    } catch (e) {
      host.__callback(callbackKey, {
        msg: String(e && e.message ? e.message : e),
        code: 40001,
        data: {},
      })
    }
  }

  /**
   * 多端分流：
   * 1) App 壳（Android/iOS/Harmony/macOS）→ kWHScriptHandlerName
   * 2) 微信小程序 web-view → wx.miniProgram
   * 3) 普通浏览器 → 明确失败（禁止静默、禁止写成「只能微信」）
   */
  host.postMessage = function (fullParam) {
    var action = fullParam && fullParam.action ? String(fullParam.action) : ''
    var callbackKey = fullParam && fullParam.callbackKey

    if (postToNativeBridge(fullParam)) {
      return
    }

    if (!isWechatClient()) {
      failNoBridge(action, callbackKey)
      return
    }

    ensureMiniProgram(function (err, mp) {
      if (err || !mp) {
        failNoBridge(
          action,
          callbackKey,
          (err && err.message) || 'wx.miniProgram unavailable',
        )
        return
      }
      host.webViewEnv = 'wechat'
      if (!host.platform || host.platform === 'web' || host.platform === 'h5') {
        host.platform = 'wechat'
      }
      dispatchWithMini(mp, fullParam)
    })
  }

  if (typeof window !== 'undefined') {
    consumeInboundFromUrl()
    window.addEventListener('pageshow', consumeInboundFromUrl)
    window.addEventListener('popstate', consumeInboundFromUrl)
  }
}

if (typeof window !== 'undefined') {
  installWechat(window)
}

export default installWechat
