/**
 * 扁平化挂载 api-names 中的方法。
 * 参考 hybrid-jssdk-test-page/src/es5/modules/Sdk.js
 */
import SyncTask from './SyncTask.js'
import apiNames from '../api-names.js'

export default function Sdk() {
  SyncTask.call(this)
  this.apis = []
  // 构建时由 vite define 注入，与 package.json / 产物文件名一致
  this.version = typeof __JSSDK_VERSION__ !== 'undefined' ? __JSSDK_VERSION__ : '0.1.0'

  var self = this

  function bindApi(apiName, isAsync, eventType, lackCallback) {
    self[apiName] = function (params) {
      self.messageOn({
        apiName: apiName,
        isAsync: isAsync,
        eventType: eventType,
        lackCallback: lackCallback,
        params: {
          bussParams: params,
        },
      })
    }
  }

  var list = (apiNames && apiNames.apis) || []
  for (var i = 0; i < list.length; i++) {
    var parts = String(list[i]).split('-')
    var apiName = parts[0]
    var isAsync = parts[1] || 'async'
    var eventType = parts[2] || 'function'
    var lackCallback = Boolean(parts[3])

    this.apis.push({
      apiName: apiName,
      isAsync: isAsync,
      eventType: eventType,
    })

    bindApi(apiName, isAsync, eventType, lackCallback)
  }
}
