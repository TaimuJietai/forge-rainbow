/**
 * 原生交互基础层（参考 hybrid-jssdk-test-page/src/es5/modules/Invoke.js）。
 * 只依赖 window.webViewHost（由 hybrid-jssdk 注入或微信脚本安装）。
 */

export default function Invoke() {
  var __defaultParams = {}
  var __errorHandler = function () {}
  var __isReady = false
  var __readyRes
  var self = this

  this.defaultParams = function () {
    __defaultParams.sig =
      parseInt(Math.random() * 10000, 10) + parseInt(Date.now() / 1000, 10) + ''
    return __defaultParams
  }

  this.getIsReady = function () {
    if (typeof window === 'undefined' || !window.location) {
      return false
    }
    return __isReady === window.location.href.split('#')[0]
  }

  this.isFunction = function (params) {
    return typeof params === 'function'
  }

  this.sayError = function (res, params) {
    var fail =
      (params && this.isFunction(params.fail) && params.fail) ||
      (params &&
        params.bussParams &&
        this.isFunction(params.bussParams.fail) &&
        params.bussParams.fail)
    if (fail && this.isFunction(fail)) {
      fail(res)
    } else {
      __errorHandler(res)
    }
  }

  this.processResult = function (params, res) {
    var msg = (res && res.msg) || ''
    if (msg.indexOf('::ok') !== -1) {
      var success =
        (params && this.isFunction(params.success) && params.success) ||
        (params &&
          params.bussParams &&
          this.isFunction(params.bussParams.success) &&
          params.bussParams.success)
      if (success && this.isFunction(success)) {
        success(res)
      }
    } else if (msg.indexOf('::cancel') !== -1) {
      var cancel =
        (params && this.isFunction(params.cancel) && params.cancel) ||
        (params &&
          params.bussParams &&
          this.isFunction(params.bussParams.cancel) &&
          params.bussParams.cancel)
      if (cancel && this.isFunction(cancel)) {
        cancel(res)
      }
    } else {
      this.sayError(res, params)
    }
  }

  function mergeResult(res) {
    var data = (res && res.data) || {}
    if (typeof data === 'string') {
      try {
        if (
          (data.indexOf('%5B') !== -1 && data.indexOf('%5D') !== -1) ||
          (data.indexOf('%7B') !== -1 && data.indexOf('%7D') !== -1)
        ) {
          data = JSON.parse(decodeURIComponent(data))
        }
      } catch (e) {
        // keep string
      }
    }
    var out = {
      msg: (res && res.msg) || '',
      code: res && typeof res.code !== 'undefined' ? res.code : '',
    }
    if (data && typeof data === 'object') {
      for (var key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
          out[key] = data[key]
        }
      }
    }
    return out
  }

  function resultCallback(opts) {
    opts = opts || {}
    var callback = opts.callback
    var params = (opts.params && opts.params.bussParams) || opts.params || {}
    var res = opts.res || {}
    var result = mergeResult(res)

    if (self.isFunction(callback)) {
      callback(result)
    } else {
      self.processResult(params, result)
    }
    if (params && self.isFunction(params.complete)) {
      params.complete(result)
    }
  }

  this.invoke = function (invokeParams) {
    invokeParams = invokeParams || {}
    var active = invokeParams.active || ''
    var params = invokeParams.params || {}
    var eventType = invokeParams.eventType || 'function'
    var callback = invokeParams.callback
    var lackCallback = invokeParams.lackCallback || false

    if (!active) {
      throw new Error('invoke api name is empty.')
    }

    if (typeof window === 'undefined' || typeof window.webViewHost === 'undefined') {
      resultCallback({
        callback: callback,
        params: params,
        res: { msg: 'Illegal device: webViewHost missing', code: 10001 },
      })
      return
    }

    if (eventType === 'function') {
      var merged = {}
      var defaults = this.defaultParams()
      var key
      if (params && typeof params === 'object') {
        for (key in params) {
          if (Object.prototype.hasOwnProperty.call(params, key)) {
            merged[key] = params[key]
          }
        }
      }
      for (key in defaults) {
        if (Object.prototype.hasOwnProperty.call(defaults, key)) {
          merged[key] = defaults[key]
        }
      }

      var hostCallback = !lackCallback
        ? function (res) {
            try {
              res = typeof res === 'string' ? JSON.parse(decodeURIComponent(res)) : res
            } catch (e) {
              // keep raw
            }
            resultCallback({
              callback: callback,
              params: params,
              res: res,
            })
          }
        : undefined

      window.webViewHost.invoke(active, merged, hostCallback)
    } else {
      window.webViewHost.on(active, function (res) {
        resultCallback({
          callback: callback,
          params: params,
          res: res,
        })
      })
    }
  }

  this.ready = function (callback) {
    var that = this
    if (!this.getIsReady()) {
      this.invoke({
        active: 'ready',
        params: {
          success: function (res) {
            if (typeof window !== 'undefined' && window.location) {
              __isReady = window.location.href.split('#')[0]
            } else {
              __isReady = true
            }
            __readyRes = res
            if (that.isFunction(callback)) {
              callback(res)
            }
          },
          fail: callback,
        },
      })
    } else if (this.isFunction(callback)) {
      callback(__readyRes)
    }
  }

  this.config = function (params) {
    // 鉴权字段留下；回包走 processResult（success/fail），不吞掉壳的 __callback
    var next = params || {}
    __defaultParams = next
    this.invoke({
      active: 'config',
      params: next,
    })
  }

  this.error = function (callback) {
    if (this.isFunction(callback)) {
      __errorHandler = callback
    }
  }
}
