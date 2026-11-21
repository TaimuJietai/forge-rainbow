/**
 * WebViewHost 传输层（源码）。
 * 禁止把本文件原文注入 WebView；请构建 dist/web-view-host.min.js。
 * 协议见 docs/plan/WebViewHost通讯规范.md
 */

function installWebViewHost(global) {
  if (!global) {
    return
  }

  var boot =
    global.__WVH_BOOT__ && typeof global.__WVH_BOOT__ === 'object'
      ? global.__WVH_BOOT__
      : null
  var platform =
    boot && typeof boot.platform === 'string' && boot.platform
      ? String(boot.platform).toLowerCase()
      : 'h5'

  global.webViewHost = {
    webViewEnv: 'h5',
    platform: platform,
    version: '1.0.0',
    callbackPool: {},
    actionCallbackKey: 1,
    reqs: {},

    isFunction: function (p) {
      return typeof p === 'function'
    },

    invoke: function (_action, _data, _callback) {
      var fullParam = {
        action: _action,
        param: _data,
      }
      fullParam.callbackKey =
        'cbk_' + parseInt(Math.random() * 1000, 10) + '_' + this.actionCallbackKey++
      this.callbackPool[fullParam.callbackKey] = this.isFunction(_callback)
        ? _callback
        : function () {}
      this.postMessage(fullParam)
    },

    /* 仅走原生注入的桥；无桥时回失败，避免页面「点了没反应」 */
    postMessage: function (fullParam) {
      var bridge = global.kWHScriptHandlerName
      if (bridge && this.isFunction(bridge.postMessage)) {
        bridge.postMessage(encodeURIComponent(JSON.stringify(fullParam)))
        return
      }
      var key = fullParam && fullParam.callbackKey
      if (key) {
        this.__callback(key, {
          msg: 'Illegal device: no native bridge',
          code: 10001,
          data: { action: fullParam && fullParam.action },
        })
      }
    },

    __callback: function (_callbackKey, _param) {
      if (this.isFunction(this.callbackPool[_callbackKey])) {
        this.callbackPool[_callbackKey](_param)
        this.callbackPool[_callbackKey] = undefined
      }
    },

    on: function (_action, _callback) {
      this.reqs[String(_action)] = _callback
    },

    __fire: function (_action, _data) {
      var funcCached = this.reqs[String(_action)]
      if (this.isFunction(funcCached)) {
        funcCached(_data)
      }
    },
  }
}

if (typeof window !== 'undefined') {
  installWebViewHost(window)
}

export default installWebViewHost
