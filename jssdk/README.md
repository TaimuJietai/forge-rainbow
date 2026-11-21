# jssdk（H5 业务侧）

业务页调用的 JS SDK，全局 **`window.Rainbow`**。  
底层依赖原生 / 微信提供的 **`window.webViewHost`**（见 `hybrid-jssdk`）。

| 包 | 谁加载 | 全局 |
|----|--------|------|
| `hybrid-jssdk` | App 壳注入；微信页可先引 `wechat.js` | `webViewHost` |
| **`jssdk`** | 业务 H5（如 `vue`）自行引入 | `Rainbow` |

设计参考：`hybrid-jssdk-test-page/src/es5`（Invoke → SyncTask → Sdk）。

## 命令

```sh
cd jssdk
pnpm install
pnpm build   # → dist/jssdk.{version}.min.js（version 来自 package.json，破缓存）
```

脚本标签引入时务必带版本号，例如 `jssdk.0.1.0.min.js`；升 `package.json` 的 `version` 后再 build。

## 调通 API（首期）

```js
Rainbow.config({ debug: true })   // 可选鉴权占位
Rainbow.error(function (err) { console.error(err) })

Rainbow.ready(function (res) {
  // res.msg 含 ::ok 表示壳侧就绪
})

Rainbow.ping({
  success: function (res) { console.log('ping ok', res) },
  fail: function (err) { console.error(err) },
})
```

原生须按 `apis.json`（及 Invoke 内置 `ready` / `config`）实现同名 `action`，并 `webViewHost.__callback`。  
`pnpm`/`npm` 在 `hybrid-jssdk` 里 `build` 时会 sync 该清单到各端。微信：`ready`/`ping` 多在 `wechat.js` 即时回包。

## 业务引入

```ts
// App：壳已注入 webViewHost，只引 jssdk
// 微信 / 本地：先保证 webViewHost（wechat.js），再引 jssdk
import '../../hybrid-jssdk/src/wechat.js'
import '../../jssdk/src/index.js'
```
