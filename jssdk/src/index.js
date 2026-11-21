/**
 * H5 业务 JSSDK 入口 → 构建产物 dist/jssdk.{version}.min.js
 * 全局：window.Rainbow
 *
 * 依赖：window.webViewHost（App 注入 hybrid-jssdk/web-view-host，或微信页先引 hybrid-jssdk/wechat）
 */
import Sdk from './modules/Sdk.js'

function createInstance() {
  return new Sdk()
}

var instance = createInstance()

if (typeof window !== 'undefined') {
  window.Rainbow = instance
  if (typeof window.sdkReadyCallback === 'function') {
    window.sdkReadyCallback(instance)
  }
}

export default instance
