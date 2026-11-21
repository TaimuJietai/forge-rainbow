# hybrid-jssdk（原生注入层）

各 **App 壳** Document Start 注入的传输脚本，全局 **`window.webViewHost`**。  
业务 API 请用根目录 **`jssdk/`**（`window.Rainbow`），不要在业务里直接当「完整 SDK」用本包。

| 源码 | 产物 | 用途 |
|------|------|------|
| `src/web-view-host.js` | `dist/web-view-host.min.js` | App 壳注入 |
| `src/wechat.js` | `dist/wechat.min.js` | 微信 web-view 内安装/改写 host（无原生桥时） |

根目录 `web-view-host.js` 为旧原文**仅参考**，不参与构建。

协议：[`docs/plan/WebViewHost通讯规范.md`](../docs/plan/WebViewHost通讯规范.md)

## 构建

```sh
cd hybrid-jssdk
pnpm install
pnpm build   # 构建 + sync 到各原生端
# 仅同步：pnpm sync
```

只注入 `dist/*.min.js`（Android 勿注带注释源码）。
