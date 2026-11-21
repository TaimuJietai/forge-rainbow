# forge-rainbow · 彩虹锻造

多端 WebView 壳工程：用原生壳加载同一套 Web 内容（当前远程地址为 `https://dv.phb.plus/`），覆盖 Android、iOS、鸿蒙、macOS 与微信小程序。

## 目录结构

```
forge-rainbow/
├── hybrid-jssdk/         # 原生注入的 webViewHost；微信另有 wechat.js
├── jssdk/                # H5 业务 SDK（window.Rainbow），依赖 webViewHost
├── vue/                  # Vue 3 + Vite 前端（可本地开发 / 打包后同步进原生）
├── native/
│   ├── android/          # Android WebView 壳
│   ├── ios/              # iOS WKWebView 壳
│   ├── macOS/            # macOS WKWebView 壳
│   ├── ohos/             # 鸿蒙 ArkTS 工程
│   └── wechat-miniapp/   # 微信小程序（web-view）
├── configuration/        # 共用配置与品牌资源
│   ├── logo/             # 应用图标 / Logo
│   └── webview.json      # 目标页 url + 域名白名单 allowedHosts
├── docs/                 # 文档（文件名须中文）
└── scripts/              # 根级脚本（sync-native-assets 等）
```

## 工作方式

- **原生壳**：App 注入 `hybrid-jssdk` 的 `web-view-host.min.js`（微信除外）。
- **H5 JSSDK**：业务引 `jssdk` → `window.Rainbow`（`ready` / `ping` 调通）。
- **微信**：H5 先保 `webViewHost`（`wechat.js`），再引 `jssdk`；小程序 `bindmessage` + 改 src。
- **通讯规范**：`docs/plan/WebViewHost通讯规范.md`；H5 计划：`docs/plan/H5端JSSDK开发计划.md`。

## 快速开始（hybrid-jssdk + jssdk）

```sh
cd hybrid-jssdk && pnpm install && pnpm build   # 含 sync 到各原生端
cd ../jssdk && pnpm install && pnpm build
```

## 快速开始（前端）

```sh
cd vue
pnpm install
pnpm dev      # 本地开发，默认端口 7003
#   /           Three Demo
#   /test.html  JSSDK 测试页
pnpm build    # 类型检查 + 多页面构建 + 同步到各 native 工程
```

## 各端工程

| 平台     | 路径                         | 说明 |
|----------|------------------------------|------|
| Android  | `native/android`             | Kotlin + WebView，应用名「彩虹锻造」 |
| iOS      | `native/ios`                 | Objective-C + WKWebView |
| macOS    | `native/macOS`               | Objective-C + WKWebView |
| 鸿蒙     | `native/ohos`                | DevEco / HarmonyOS 工程 |
| 微信小程序 | `native/wechat-miniapp`    | web-view 打开远程页（无法注入脚本） |

## 配置

编辑 `configuration/webview.json`，然后：

```sh
node scripts/sync-native-assets.mjs
```
