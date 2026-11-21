# 彩虹 SDK 交互统一与微信适配

> 状态：进行中  
> 创建日期：2026-11-19  
> 更新日期：2026-11-20  
> 摘要：**已删除根目录 `sdk/`**；统一落到 `hybrid-jssdk`（`webViewHost`）。微信脚本：`hybrid-jssdk/src/wechat.js`  
> 关联：[`WebViewHost通讯规范.md`](./WebViewHost通讯规范.md)、[`hybrid-jssdk/README.md`](../../hybrid-jssdk/README.md)

---

## 1. 结论

| 原方案 | 现状 |
|--------|------|
| 根目录 `sdk/` + `window.rainbow` | **废弃并删除** |
| App / 微信双入口 | App 注 `web-view-host.min.js`；微信 H5 引 `wechat.js` |
| 对外 API | `window.webViewHost.invoke` / `on` / `__callback` / `__fire` |

---

## 2. 微信双向

### 出站（H5 → 小程序）

`wechat.js` 覆盖 `postMessage`：

- 即时：`navigateBack` / `navigateTo` / … / `getEnv` → `wx.miniProgram.*`，再 `__callback`
- 其它：信封 `{ action, param, callbackKey }` → `postMessage`，`__callback` 为 `::queued`

小程序：`utils/rainbow-bridge.ts` + `bindmessage`。

### 入站（小程序 → H5）

改 `web-view` 的 `src`：

```
?rainbow_platform=wechat&rainbow_event=app.show&rainbow_event_data=%7B%7D&rainbow_event_id=…
```

`wechat.js` 解析后调用 `webViewHost.__fire`。

### 业务引入

```js
import '../hybrid-jssdk/src/wechat.js'
```

---

## 3. 清单

- [x] 删除 `sdk/`  
- [x] `hybrid-jssdk/src/wechat.js`  
- [x] 双产物构建 + sync host 到 native  
- [x] vue 改引 wechat  
- [ ] 能力表另文  

---

*更新日期：2026-11-20 · 废弃 sdk/，微信脚本并入 hybrid-jssdk。*
