# H5 端 JSSDK 开发计划

> 状态：进行中  
> 创建日期：2026-11-20  
> 更新日期：2026-11-20  
> 摘要：根目录 `jssdk/` 为业务 H5 调用层（`window.Rainbow`）；`hybrid-jssdk` 为原生注入的 `webViewHost`。首期只做 `ready` / `ping` 调通  
> 目标目录：`jssdk/`  
> 全局对象：`window.Rainbow`  
> 参考：`hybrid-jssdk-test-page/src/es5`  
> 关联：[`WebViewHost通讯规范.md`](./WebViewHost通讯规范.md)

---

## 1. 分层

```
业务 H5
  └─ window.Rainbow          ← jssdk（Invoke → SyncTask → Sdk）
        └─ window.webViewHost ← hybrid-jssdk（App 注入 / wechat.js）
              └─ 原生桥 / wx.miniProgram
```

| 包 | 职责 |
|----|------|
| `hybrid-jssdk` | 壳注入脚本；微信 `wechat.js` |
| `jssdk` | H5 API：任务池、success/fail、扁平方法 |

---

## 2. 首期范围

- [x] `jssdk` 脚手架 + Vite 压缩产物 `dist/jssdk.{version}.min.js`  
- [x] es5 同构：Invoke / SyncTask / Sdk / api-names  
- [x] `Rainbow.ready` / `Rainbow.ping` 调通  
- [x] `vue` 引入 wechat host + jssdk  
- [x] `vue` 多页面：`index.html` Three Demo；`test.html` JSSDK 测试（自 hybrid-jssdk-test-page 迁入）  
- [x] 原生按 `apis.json` / api-names 响应：`ready` / `ping` / `config`（Android / iOS / macOS / OHOS）  
- [x] sync 拷贝 `jssdk/apis.json` → 各端 `configuration/jssdk-apis.json`  
- [ ] 扩展业务 API 表  

---

## 3. 用法

```js
Rainbow.ready(function (res) { /* ::ok */ })
Rainbow.ping({ success: function (res) {} })
```

---

*更新日期：2026-11-20 · 首期脚手架与调通 API。*
