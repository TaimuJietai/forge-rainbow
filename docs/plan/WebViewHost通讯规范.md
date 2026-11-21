# WebViewHost 通讯规范

> 状态：进行中  
> 创建日期：2026-11-20  
> 更新日期：2026-11-20  
> 摘要：唯一 JS 桥工程 `hybrid-jssdk`；App 注 `web-view-host.min.js`，微信 H5 引 `wechat.js`；根目录 `sdk/` 已删除  
> 源码目录：`hybrid-jssdk/`  
> App 产物：`dist/web-view-host.min.js`  
> 微信产物：`dist/wechat.min.js`（业务自带）  
> 全局对象：`window.webViewHost`  
> 关联：[`彩虹SDK交互统一与微信适配.md`](./彩虹SDK交互统一与微信适配.md)

---

## 1. 定位

| 层 | 对象 | 职责 |
|----|------|------|
| **传输层（本文）** | `window.webViewHost` | App 壳注入 `web-view-host.min.js`；H5 ↔ 原生信封与回调池 |
| 微信 web-view | `src/wechat.js` | 业务自带；同一 API，换 `postMessage` / URL 入站（见 §6） |

`hybrid-jssdk/web-view-host.js` 来自旧项目，含块注释与未压缩语法；Android `evaluateJavascript` 对带注释源码易踩坑。**必须以 Vite + terser 构建后再注入**，禁止把源文件原文塞进 WebView。

---

## 2. 构建与注入约定

### 2.1 构建

```sh
cd hybrid-jssdk
pnpm install
pnpm build   # → dist/web-view-host.min.js + dist/wechat.min.js
```

| 要求 | 约定 |
|------|------|
| 格式 | IIFE，执行后挂 `window.webViewHost` |
| 目标 | ES5（旧 WebView 可解析） |
| 压缩 | `minify: 'terser'`，`format.comments: false`（**去掉全部注释**） |
| 产物 | 单文件、无 `import`/`export`、无可选链等现代语法 |

### 2.2 原生注入顺序

1. （可选）写入桥名等 boot，如 `window.kWHScriptHandlerName = …`（iOS WK 侧）  
2. 执行 **`web-view-host.min.js` 全文**（Document Start）  
3. 再注入 / 加载业务页与 `rainbow`（若分离）

验收：注入后 `typeof webViewHost === 'object' && typeof webViewHost.invoke === 'function'`。

---

## 3. 消息信封（核心）

所有 H5 → 原生的一次调用，序列化为同一结构：

```js
{
  action: string,       // 能力名，如 'uploadImage'、'getUserInfo'
  param: object | any,  // 业务参数；无参时可为 {} 或省略语义上的空对象
  callbackKey: string   // 回调票根，格式 cbk_<random>_<seq>
}
```

| 字段 | 说明 |
|------|------|
| `action` | 原生 handler 路由键；大小写与方法表一致 |
| `param` | 透传业务数据；原生侧自行校验 |
| `callbackKey` | H5 回调池键；**有无业务回调都生成**，便于原生统一回包 |

过桥编码（App 壳）：

- 原生注入桥（如 `kWHScriptHandlerName.postMessage`）：`encodeURIComponent(JSON.stringify(fullParam))`  
- **不再**使用 iframe / 自定义 Scheme（`WOWNOW://`）兜底；那是旧版未压缩脚本的权宜之计

原生解析后须保留 `callbackKey`，回包时原样交还。

---

## 4. 双向交互模型

```
┌────────────── H5 ──────────────────────────────────────┐
│  invoke(action, param, cb)                             │
│    → callbackPool[callbackKey] = cb                    │
│    → postMessage(信封)                                  │
│                                                        │
│  on(action, handler)     ← 注册推送监听（一对一）         │
│  __callback(key, result) ← 仅原生调用（RPC 回包）        │
│  __fire(action, data)    ← 仅原生调用（事件推送）        │
└──────────────────────────▲─────────────────────────────┘
                           │
              App 壳解析信封 / evaluate JS
                           │
┌────────────── Native ──────────────────────────────────┐
│  收到信封 → 执行 action →                               │
│    成功/取消/失败：evaluate                                │
│      webViewHost.__callback(callbackKey, result)       │
│  主动通知：                                              │
│      webViewHost.__fire(action, data)                  │
└────────────────────────────────────────────────────────┘
```

### 4.1 H5 → 原生（请求）

```js
webViewHost.invoke('uploadImage', { count: 1 }, function (result) {
  // result 见 §5
})
```

### 4.2 原生 → H5（RPC 回包）

```js
// 原生 evaluateJavascript / runJavaScript
webViewHost.__callback('cbk_123_1', {
  msg: 'uploadImage::ok',
  code: 0,
  data: { serverId: 111 }
})
```

- 命中池内函数则执行一次，随后将该槽位置 `undefined`（一次性回调）。  
- 未知 `callbackKey`：忽略，不抛错。

### 4.3 原生 → H5（事件推送）

```js
webViewHost.on('app.show', function (data) { /* ... */ })

// 原生
webViewHost.__fire('app.show', { /* payload */ })
```

当前实现：**一对一**（后注册覆盖先注册）。若需一对多，将 `reqs[action]` 改为数组（规范允许后续演进，需同步改原生与文档）。

### 4.4 对外不暴露的约定

| 符号 | 调用方 | 说明 |
|------|--------|------|
| `invoke` / `on` / `postMessage` | H5 / 上层 SDK | 公开 |
| `__callback` / `__fire` | **仅原生** | 以下划线标明；业务勿直接调 |

---

## 5. 回包 `result` 形态

与旧项目对齐，统一三字段：

```js
{
  msg: string,   // 可读说明；成功习惯 '{action}::ok'，取消 '{action}::cancel'
  code: number,  // 0 表示业务可接受的完成（含 cancel）；非 0 为失败
  data: object   // 载荷；失败时可为空对象
}
```

| 场景 | 示例 |
|------|------|
| 成功 | `{ msg: 'uploadImage::ok', code: 0, data: { serverId: 111 } }` |
| 用户取消 | `{ msg: 'uploadImage::cancel', code: 0, data: {} }` |
| 失败 | `{ msg: '参数不能为空', code: 40001, data: {} }` |

上层 `rainbow.call` 落地时，可将 `code !== 0` 映射为 Promise reject，`cancel` 可单独约定（本规范不强制）。

---

## 6. 微信小程序：同一规则下的受限双向

微信 `<web-view>` **不能**注入 `web-view-host.min.js`，也 **不能**随时向页内 `evaluate` `__callback` / `__fire`。  
因此小程序**复用信封与 API 外形**，换通道；能力矩阵必须诚实降级（与 [`彩虹SDK交互统一与微信适配.md`](./彩虹SDK交互统一与微信适配.md) 一致）。

### 6.1 映射

| 规范能力 | App 壳 | 微信 web-view |
|----------|--------|----------------|
| 注入 `webViewHost` | Document Start 注入 min 产物 | **无**；H5 用 `rainbow` h5 入口模拟同名语义 |
| H5 → 壳 `invoke` | 原生桥 `postMessage` 即时送达 | `wx.miniProgram.postMessage({ data: 信封 })`；**非即时**，多在后退/销毁/分享时随 `bindmessage` 到达 |
| 壳 → H5 `__callback` | `evaluate` 即时回包 | **无通用通道**；需回调的能力标「微信不可用」或改走：改 `src` 带结果 query / 业务 HTTPS |
| 壳 → H5 `__fire` | `evaluate` 推送 | 小程序改 `web-view` 的 `src`（URL boot / 事件 query）触发页侧重读；或业务推送 |

### 6.2 推荐用法（小程序）

1. **出站（H5 → 小程序）**  
   - 传输层把同一信封交给 `wx.miniProgram.postMessage`。  
   - 小程序 `bindmessage` 收 `e.detail.data`（数组，多次 post 会攒批）。  
   - 适合：分享自定义字段、离开页时上报、无返回值通知。  
   - **不适合**：强依赖即时 `callback` 的选图、支付结果等（应走微信 JSSDK / 小程序自身 API，或标为 App-only）。

2. **入站（小程序 → H5）**  
   - 打开或更新：`src` 追加 query（已有 `rainbow_platform=wechat`；可扩展 `rainbow_event` / `rainbow_boot`）。  
   - H5 `readBoot` / 监听 `pageshow` 解析 query，在 SDK 内模拟 `__fire` 语义。  
   - 避免假装 `__callback` 已成功。

3. **与 `rainbow` 的关系**  
   - 业务只调 `rainbow.call` / `rainbow.on`。  
   - `channel === 'native'`：底层走本规范的 `webViewHost`。  
   - `channel === 'h5'`（含微信）：底层走 postMessage + URL；**同一 `action` 名**，能力表按端声明。

### 6.3 小程序侧伪代码（收出站）

```js
// pages/index/index.ts — bindmessage
onWebMessage(e) {
  const list = (e.detail && e.detail.data) || []
  list.forEach((envelope) => {
    // envelope ≈ { action, param, callbackKey }
    // 按 action 分发；不要假设能即时 __callback 回 H5
  })
}
```

---

## 7. 实施清单

- [x] 信封、回调、`__fire`、回包形态  
- [x] Vite：ES5 + 去注释；`web-view-host` + `wechat` 双产物  
- [x] 删除根目录 `sdk/`，统一 `webViewHost`  
- [x] sync 拷贝 `web-view-host.min.js` 到各端  
- [x] 小程序 `rainbow-bridge` + `bindmessage`  
- [x] 原生按 `jssdk/apis.json` 响应 `ready` / `ping` / `config`（四端桥 + 微信队列日志）  
- [ ] 扩展业务方法能力表  

---

## 8. 风险

| 风险 | 缓解 |
|------|------|
| Android 注入带注释源码报错 | **只注入 dist min 文件**；已弃用 iframe Scheme 兜底 |
| 微信假即时回包 | 队列类只给 `::queued`；真回包仅限微信即时 API |

---

*更新日期：2026-11-20 · 去掉 iframe/Scheme 出站；仅原生桥 postMessage。*
