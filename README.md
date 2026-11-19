# forge-rainbow · 彩虹锻造

多端 WebView 壳工程：用原生壳加载同一套 Web 内容（当前远程地址为 `https://dv.phb.plus/`），覆盖 Android、iOS、鸿蒙与微信小程序。

## 目录结构

```
forge-rainbow/
├── vue/                  # Vue 3 + Vite 前端（可本地开发 / 打包后同步进原生）
├── native/
│   ├── android/          # Android WebView 壳
│   ├── ios/              # iOS WKWebView 壳
│   ├── ohos/             # 鸿蒙 ArkTS 工程
│   └── wechat-miniapp/   # 微信小程序（web-view）
├── configuration/        # 共用配置与品牌资源
│   ├── logo/             # 应用图标 / Logo
│   └── webview.json      # 远程 WebView URL
├── docs/                 # 文档（文件名须中文）
└── scripts/              # 根级脚本（预留）
```

## 工作方式

- **原生壳**：各端用 WebView / web-view 打开远程页，并带启动遮罩与加载态。
- **前端包**：`vue` 构建为适合嵌入 WebView 的产物（相对路径、IIFE），`pnpm build` 后经 `scripts/postbuild.mjs` 同步到各端 `web` 资源目录，并写入内容哈希版本。
- **共用配置**：远程地址优先读 `configuration/webview.json`；品牌资源放在 `configuration/logo/`。

## 快速开始（前端）

```sh
cd vue
pnpm install
pnpm dev      # 本地开发，默认端口 7003
pnpm build    # 类型检查 + 构建 + 同步到各 native 工程
```

## 各端工程

| 平台     | 路径                         | 说明 |
|----------|------------------------------|------|
| Android  | `native/android`             | Kotlin + WebView，应用名「彩虹锻造」 |
| iOS      | `native/ios`                 | Objective-C + WKWebView |
| 鸿蒙     | `native/ohos`                | DevEco / HarmonyOS 工程 |
| 微信小程序 | `native/wechat-miniapp`    | web-view 打开远程页 |

用对应 IDE（Android Studio、Xcode、DevEco Studio、微信开发者工具）打开上述目录即可调试与打包。

## 配置

编辑 `configuration/webview.json` 可改远程入口，例如：

```json
{
  "url": "https://dv.phb.plus/"
}
```

重新执行 `vue` 下的 `pnpm build` 后，版本信息与 `origin` 会写入各端同步目录中的 `webview.config.json`。
