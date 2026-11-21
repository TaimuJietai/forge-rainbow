import '../assets/main.css'

// webViewHost：无壳时由 wechat 入口兜底（优先原生桥 → 微信 → 明确失败）；App 已注入则不覆盖
import '../../../hybrid-jssdk/src/wechat.js'
// H5 业务 JSSDK → window.Rainbow
import '../../../jssdk/src/index.js'

import { createApp } from 'vue'
import VConsole from 'vconsole'
import App from './App.vue'

new VConsole()

createApp(App).mount('#app')
