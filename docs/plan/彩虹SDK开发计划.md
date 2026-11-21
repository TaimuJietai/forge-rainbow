# 彩虹 SDK 开发计划

> 状态：已废弃  
> 创建日期：2026-11-19  
> 更新日期：2026-11-20  
> 摘要：原根目录 `sdk/` + `window.rainbow` 方案**已废弃并删除**。传输层与微信脚本统一到 `hybrid-jssdk`（`window.webViewHost`）。  
> 替代：[`WebViewHost通讯规范.md`](./WebViewHost通讯规范.md)、[`彩虹SDK交互统一与微信适配.md`](./彩虹SDK交互统一与微信适配.md)、[`hybrid-jssdk/README.md`](../../hybrid-jssdk/README.md)

---

请勿再新增 `sdk/` 工程或 `rainbow` 全局对象。App 注入 `web-view-host.min.js`；微信 H5 引入 `wechat.js`。

---

*更新日期：2026-11-20 · 标记废弃，指向 hybrid-jssdk。*
