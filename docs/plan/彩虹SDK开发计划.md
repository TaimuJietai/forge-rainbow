# 彩虹 SDK 开发计划

> 状态：规划中  
> 创建日期：2026-11-19  
> 更新日期：2026-11-19  
> 摘要：纯 JS SDK（Vite → ES5）植入各端 WebView，全局对象 `rainbow`；共用 `configuration/webview.json`（目标页 + 域名白名单）  
> 目标目录：`sdk/`  
> 全局对象：`window.rainbow`  
> 共用配置：`configuration/webview.json`（目标页 URL + 域名白名单）  
> 首期交付：可注入的压缩 ES5 单文件 + 系统名 Demo；配置约定同步写入本文

---

## 1. 背景与目标

本仓库是多端 WebView 壳（Android / iOS / 鸿蒙 / macOS / 微信小程序），共同加载同一套 Web 内容。需要在根目录 `sdk/` 新建**纯 JS** 桥接 SDK：

1. 用 **Vite** 构建出**一份压缩后的 ES5** 脚本（单文件 IIFE）。
2. 各原生端将该脚本植入 WebView（页面加载前注入）。
3. 页面内通过全局对象 **`rainbow`** 访问能力。
4. **Demo 阶段**：原生注入当前系统名，H5 可读，验证「原生 → JS」通路。
5. **共用配置**：WebView **目标页 URL** 与 **域名白名单** 统一放在 `configuration/webview.json`，各原生端从包内副本读取（见 §4）。

后续可在同一对象上扩展 bridge、设备信息、导航等能力；本期不做完整 Bridge。

---

## 2. 范围

### 2.1 In Scope（本期）

| 项 | 说明 |
|----|------|
| `sdk/` 工程脚手架 | Vite library 模式，纯 JS（可不引入 Vue） |
| 构建产物 | 单文件、压缩、ES5、IIFE，挂到 `window.rainbow` |
| Demo API | 暴露系统名（如 `rainbow.platform` / `rainbow.getPlatform()`） |
| 原生注入（优先三端） | Android、iOS、鸿蒙：在文档加载前注入 SDK + 平台常量 |
| 共用配置约定 | 扩展 `configuration/webview.json`：`url` + `allowedHosts`；同步进各端包内 |
| 联调页 | 可选：临时页面或控制台可读 `rainbow`，确认系统名正确 |
| 文档 | `sdk/README.md`：构建命令、产物路径、注入约定 |

### 2.2 Out of Scope（本期不做）

- JS → 原生双向 Bridge（`postMessage` / `JavascriptInterface` 完整协议）
- 微信小程序 web-view 内注入（业务域名页无法由小程序注入任意脚本，见 §8）
- TypeScript 强类型发布包 / npm publish
- 与 `vue/` 前端强耦合（SDK 独立构建；H5 仅约定调用全局 `rainbow`）
- 通配符域名匹配（如 `*.phb.plus`）；Demo / 首期只做精确 host 列表

### 2.3 可后续跟进

- macOS 同步注入（工程已有 WKWebView，模式同 iOS）
- Bridge 方法表、事件总线、版本协商
- 构建后自动拷贝 SDK 产物与 `webview.json` 到各 `native/*/…`
- 微信侧：通过 URL query / 业务页自身脚本读「伪环境」的折中方案；公众平台业务域名与 `allowedHosts` 对齐清单
- `allowedSchemes`、通配 host、按端覆盖配置

---

## 3. 总体架构

```
┌─────────────────────────────────────────────────────────┐
│  configuration/webview.json  （仓库唯一真相源）            │
│  · url            → 启动加载的目标页                       │
│  · allowedHosts   → 导航域名白名单                         │
└───────────────────────────┬─────────────────────────────┘
                            │ sync 进各端 assets / bundle / rawfile
                            ▼
┌─────────────────────────────────────────────────────────┐
│  Native Shell (Android / iOS / OHOS / …)                │
│                                                         │
│  0. 启动时读包内 webview.json → 首页 URL + 白名单缓存      │
│  1. 配置 WKUserScript / evaluateJavascript / runJavaScript│
│  2. 注入 bootstrap：写入平台名 + 执行 rainbow.min.js      │
│  3. 导航回调：host ∉ allowedHosts → 拦截                   │
└───────────────────────────┬─────────────────────────────┘
                            │ document-start / 首屏前
                            ▼
┌─────────────────────────────────────────────────────────┐
│  WebView 页面                                            │
│                                                         │
│  window.rainbow = {                                     │
│    version: '0.1.0',                                    │
│    platform: 'android' | 'ios' | 'ohos' | …,            │
│    getPlatform(): string,                               │
│    // 后续：call / on / ready …                          │
│  }                                                      │
└─────────────────────────────────────────────────────────┘
```

**注入时序（约定）**

1. 原生在 **文档任何脚本执行前**（或尽可能早）注入：
   - `window.__RAINBOW_BOOT__ = { platform: '<name>' }`（或等价常量）
   - 再执行 `rainbow.min.js` 主体
2. SDK 启动时读取 boot 配置，初始化 `window.rainbow`，并 `Object.freeze` 核心字段（可选）。
3. H5 业务代码只依赖 `window.rainbow`，不依赖 `__RAINBOW_BOOT__`。

**系统名建议取值**

| 端 | `platform` 值 |
|----|----------------|
| Android | `android` |
| iOS | `ios` |
| 鸿蒙 | `ohos` |
| macOS | `macos` |
| 微信小程序 web-view | `wechat`（本期可不注入，仅预留） |
| 浏览器本地调试 | `web`（未注入时 SDK 默认） |

---

## 4. 共用配置：`configuration/webview.json`

### 4.1 为何用标准 JSON（一份文件）

| 考量 | 结论 |
|------|------|
| 格式 | **标准 JSON**（无注释、无尾逗号）。Android / iOS / macOS / 鸿蒙 / 小程序 / Node 脚本均有内置或零依赖解析 |
| 不用 YAML / TOML / JSON5 | 各端需额外库或无法原生解析，增加体积与出错面 |
| 单文件 | **目标页 `url` 与域名白名单 `allowedHosts` 放在同一文件**，启动只读一次、同步只拷一份 |
| 真相源 | 仓库根目录 `configuration/webview.json`；原生**不**直接读开发机路径，只读同步进包后的副本 |

现有文件已含 `url`，在此扩展白名单字段即可，不另建 `allowlist.json`。

### 4.2 字段约定（目标 schema）

```json
{
  "url": "https://dv.phb.plus/",
  "allowedHosts": [
    "dv.phb.plus",
    "cdn.phb.plus"
  ]
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `url` | `string` | 是 | WebView **启动加载的目标页**（完整 URL，含 scheme）。各端 `loadUrl` / `loadRequest` / `Web({ src })` / 小程序 `web-view` 的 `src` 均读此字段 |
| `allowedHosts` | `string[]` | 是 | 允许导航的 **host 精确列表**（不含 `https://`、路径、端口）。比对时用解析后的 `host`（忽略大小写） |

可选（后续再加，首期可不实现）：

| 字段 | 说明 |
|------|------|
| `allowedSchemes` | 默认视为仅 `https`；若出现则按列表放行 |
| `url` 必须落在白名单内 | 校验：解析 `url` 的 host 应属于 `allowedHosts`，否则构建/启动告警 |

**匹配规则（首期）**

- 只比 **精确 host**，不做 `*.phb.plus` 通配。
- 子域需显式写入列表（如 `a.phb.plus`、`b.phb.plus`）。
- `about:blank`、`data:` 等由各端按需单独放行或一律拒绝（实现时在原生侧统一约定）。

### 4.3 同步到各端（包内路径建议）

构建或根级脚本将同一文件拷到：

| 端 | 包内相对路径（建议） |
|----|----------------------|
| Android | `native/android/app/src/main/assets/configuration/webview.json` |
| iOS | Bundle 内 `configuration/webview.json`（Copy Bundle Resources） |
| macOS | 同 iOS |
| 鸿蒙 | `native/ohos/entry/src/main/resources/rawfile/configuration/webview.json` |
| 微信小程序 | `native/wechat-miniapp/miniprogram/configuration/webview.json` |

与现有 `vue/scripts/postbuild.mjs` 的关系：

- postbuild 仍可把 `url` 归一成各端 `webview.config.json` 的 `origin`（构建产物元数据）。
- **原生运行时**以包内 `configuration/webview.json` 为准读 `url` + `allowedHosts`，逐步替换各端硬编码的 `WEB_URL` / `kHomeURLString`。

### 4.4 各端读取与使用

1. **冷启动读一次**：解析 JSON → 缓存 `url`、`Set/HashSet(allowedHosts)`。
2. **打开首页**：使用缓存的 `url`，不再写死常量。
3. **导航拦截**：
   - Android：`shouldOverrideUrlLoading` / `shouldInterceptRequest`（按需要）
   - iOS / macOS：`decidePolicyForNavigationAction`
   - 鸿蒙：Web 组件导航相关回调（以当前 API 为准）
   - 命中白名单 → 允许；否则取消导航（可打日志）。
4. **微信小程序**：本地 JSON 可驱动 `web-view` 的 `src`；**真正能否打开**仍以微信公众平台「业务域名」为准，须与 `allowedHosts` 人工对齐。

### 4.5 当前仓库状态

```json
{
  "url": "https://dv.phb.plus/"
}
```

落地时在此文件增加 `allowedHosts`（至少包含 `url` 对应 host，例如 `dv.phb.plus`），并补同步脚本 / 原生读取逻辑。

---

## 5. `sdk/` 工程设计

### 5.1 目录结构（建议）

```
sdk/
├── package.json
├── vite.config.js
├── index.html              # 本地 demo 页（可选，dev 用）
├── src/
│   ├── index.js            # 入口：组装 rainbow 并挂到 window
│   ├── boot.js             # 读取 __RAINBOW_BOOT__ / 默认值
│   └── api/
│       └── platform.js     # getPlatform / platform 字段
├── dist/
│   └── rainbow.min.js      # 构建产物（提交或由 CI 产出，团队自行约定）
└── README.md
```

根目录已有空 `sdk/`，在此填充即可。

### 5.2 构建要求

| 要求 | 实现要点 |
|------|----------|
| 纯 JS | `src` 用 `.js`，避免强依赖 TS 编译链（若后续要类型，可加 JSDoc） |
| Vite library | `build.lib.entry` → `src/index.js` |
| 格式 | `formats: ['iife']`，`name: 'rainbow'` **或** 入口内手动 `window.rainbow = …`（推荐手动挂载，避免与内部导出冲突） |
| 单文件 | `inlineDynamicImports: true`，无 code-split |
| 压缩 | `build.minify: 'terser'`（或 esbuild；若 ES5 目标与 esbuild 冲突则用 terser + babel） |
| ES5 | `build.target: 'es5'`；必要时 `@vitejs/plugin-legacy` / `@babel/preset-env` 保证语法降级 |
| 文件名 | 固定 `rainbow.min.js`（`entryFileNames` / `fileName`），便于原生硬编码路径 |

**产物验收标准**

- `dist/rainbow.min.js` 可在 Android 4.4+ / 旧 WebView 语法环境下解析（无可选链、无 `const` 于最老目标时需确认 babel 覆盖）。
- 在浏览器控制台：`typeof rainbow === 'object' && rainbow.getPlatform()` 有返回值。
- 体积尽量小（Demo 阶段预期 &lt; 5KB gzip 前即可）。

### 5.3 Demo API 草案

```js
// 原生注入（示例，非最终源码）
window.__RAINBOW_BOOT__ = { platform: 'android' };

// SDK 生效后
window.rainbow.platform;       // 'android'
window.rainbow.getPlatform();  // 'android'
window.rainbow.version;        // '0.1.0'
```

未注入 boot 时：`platform === 'web'`，便于 `vue` 本地 `pnpm dev` 调试。

### 5.4 本地开发

```sh
cd sdk
pnpm install   # 或 npm
pnpm dev       # index.html 里模拟 __RAINBOW_BOOT__，验证 API
pnpm build     # 输出 dist/rainbow.min.js
```

`index.html` 可提供简单 UI：展示 `rainbow.platform`，按钮切换模拟不同系统名。

---

## 6. 原生端植入方案（Demo）

原则：**脚本内容由 SDK 构建产物提供**；原生负责「读配置」「何时注入」「写入 platform」「白名单拦截」。

首页 URL **一律**来自包内 `configuration/webview.json` 的 `url` 字段（见 §4），替换现有硬编码常量。

### 6.1 Android（`native/android`）

- 将 `rainbow.min.js` 放到 `app/src/main/assets/sdk/rainbow.min.js`（或与现有 `assets/web` 并列的 `assets/sdk`）。
- 将 `webview.json` 同步到 `assets/configuration/webview.json`；启动时解析 `url` / `allowedHosts`。
- 在 `WebViewClient` 中：
  - **推荐**：`WebViewCompat.addDocumentStartJavaScript`（AndroidX）在文档起始注入；或
  - 兼容：`onPageStarted` / 自定义 `WebViewClient` 里 `evaluateJavascript` 拼接 boot + 脚本正文。
- Boot 示例：`window.__RAINBOW_BOOT__={platform:'android'};` + 读取 asset 中的 JS 执行。
- 导航：`shouldOverrideUrlLoading` 等回调中校验 host ∈ `allowedHosts`。

涉及文件（预期）：`MainActivity.kt`（及必要时新建 `RainbowBridge.kt` / `WebViewConfig.kt`）。

### 6.2 iOS（`native/ios`）

- 将 `rainbow.min.js` 加入 App Bundle（如 `ios/sdk/rainbow.min.js`，并加入 Copy Bundle Resources）。
- Bundle 内同步 `configuration/webview.json`；启动读 `url`，导航策略读 `allowedHosts`。
- 使用 `WKUserScript`：
  - `injectionTime = WKUserScriptInjectionTimeAtDocumentStart`
  - `forMainFrameOnly = YES`（Demo 足够）
- 脚本内容 = boot 字符串 + 文件正文。
- 在创建 `WKWebViewConfiguration` 时 `userContentController.addUserScript(...)`。
- `decidePolicyForNavigationAction` 中做白名单判断。

涉及文件（预期）：`ViewController.m` 的 `setupWebView`。

### 6.3 鸿蒙（`native/ohos`）

- 将产物放入 `rawfile`（如 `resources/rawfile/sdk/rainbow.min.js`）。
- `rawfile/configuration/webview.json` 提供 `url` 与白名单。
- 使用 `Web` 组件的 `javaScriptProxy` / `onControllerAttached` + `runJavaScript` / `javaScriptOnDocumentStart`（以当前 API 为准，DevEco 版本差异需实测）。
- Boot：`platform: 'ohos'`。

涉及文件（预期）：`entry/src/main/ets/pages/Index.ets`。

### 6.4 macOS（可选，同 iOS）

- 与 iOS 相同：`WKUserScript` + Bundle 资源 + 包内 `webview.json`；`platform: 'macos'`。
- 工程：`native/macOS/macOS/ViewController.m`。

### 6.5 微信小程序（本期说明即可）

- `<web-view>` **无法**对业务域名页面注入自定义 JS。
- Demo 不作为验收阻塞项；文档中标明限制。
- `src` 可读本地 `configuration/webview.json` 的 `url`；域名能否打开仍以微信后台业务域名为准，需与 `allowedHosts` 对齐。
- 若业务页与壳同源可控，可由 **H5 自身**根据 UA / 参数设置环境，而非小程序注入 SDK 文件。

---

## 7. 实施阶段与任务拆分

### Phase 0 — 约定确认（0.5d）

- [ ] 确认全局名仅用 `rainbow`（不挂 `Rainbow` / `$rainbow`）
- [ ] 确认 platform 枚举字符串（上表）
- [ ] 确认产物是否进 git，或仅 CI 生成后拷贝到 native
- [ ] 确认 `webview.json` schema（`url` + `allowedHosts`）与各端包内同步路径（§4）

### Phase 1 — SDK 脚手架与 Demo API（1d）

- [ ] 初始化 `sdk/package.json`、Vite、脚本 `dev` / `build`
- [ ] 实现 `src`：boot 读取 + `rainbow` 挂载 + `getPlatform`
- [ ] 配置 ES5 + minify，固定输出 `dist/rainbow.min.js`
- [ ] 本地 `index.html` 验证
- [ ] 编写 `sdk/README.md`

### Phase 1b — 共用配置落地（可与 Phase 1/2 并行，约 0.5–1d）

- [ ] 扩展 `configuration/webview.json`：写入 `allowedHosts`（含目标页 host）
- [ ] 根级或既有脚本：将 `webview.json` sync 到各端包内路径
- [ ] 至少一端改为读配置中的 `url`，去掉硬编码常量
- [ ] （可选同期）导航白名单拦截；或放到 Phase 2 与注入一起做

### Phase 2 — 原生注入（Android / iOS / OHOS）（1–2d）

- [ ] 约定 SDK 产物同步路径（手动拷贝或根 `scripts/` 一小段 sync）
- [ ] Android 注入 + 读配置打开 `url` + 真机/模拟器验证 `rainbow`
- [ ] iOS 同上
- [ ] OHOS 同上
- [ ] （可选）macOS；白名单拦截按端补齐

### Phase 3 — 验收与收尾（0.5d）

- [ ] 三端截图/日志：`rainbow.getPlatform()` 与端一致
- [ ] 确认改配置中 `url` 后，同步并重装/热更资源即可换首页（无需改原生常量）
- [ ] 更新根 `README.md` 目录说明（增加 `sdk/`、补充 `webview.json` 字段）
- [ ] 本计划文档状态改为「已落地」并链到 `sdk/README.md`

**建议总工期**：约 3–4.5 人日（含配置同步与读 `url`；不含微信特殊方案与通配域名）。

---

## 8. 风险与约束

| 风险 | 说明 | 缓解 |
|------|------|------|
| ES5 与 Vite/esbuild | `target: 'es5'` 对部分语法支持不完整 | 加 babel legacy；用真机旧 WebView 抽测 |
| 注入过晚 | 页面脚本先于 SDK 执行会读到 `undefined` | 优先 Document Start；H5 侧可做短轮询 / `rainbow.ready`（后续） |
| 远程页缓存 | 仅注入 JS 不改 URL 时一般无妨；混用本地包需注意版本 | 产物带 `rainbow.version` |
| 微信 web-view | 无法注入；业务域名与本地白名单可能不一致 | SDK 注入排除验收；`allowedHosts` 与公众平台清单人工对齐 |
| 配置未进包 | 只改仓库 `configuration/`、未 sync，原生仍用旧 URL | 构建/脚本强制拷贝；文档写清路径 |
| `url` 不在白名单 | 首页 host 未写入 `allowedHosts` 导致无法打开 | 启动校验或 sync 时 assert |
| 安全 | 任意 `evaluateJavascript` 拼接用户输入有风险 | Demo 仅常量 platform，不拼接不可信数据 |
| 与 vue IIFE 包 | 两套脚本共存 | 命名空间隔离：`rainbow` vs 业务 bundle |

---

## 9. 验收标准（Definition of Done）

1. `cd sdk && pnpm build` 成功，生成可单独引用的 `dist/rainbow.min.js`。
2. 文件为 IIFE、已压缩，语法目标为 ES5（抽测无现代语法报错）。
3. Android / iOS / 鸿蒙至少一端完成注入；三端均完成后 Demo 关闭。
4. 在 WebView 已打开的页面中执行（或页面展示）：

   ```js
   rainbow.getPlatform()  // 等于当前壳：android | ios | ohos
   ```

5. 未注入环境下本地打开 SDK demo 页，默认为 `web`，不抛错。
6. `configuration/webview.json` 含 `url` 与 `allowedHosts`；至少一端从包内副本读取 `url` 作为首页（无硬编码常量）。
7. `sdk/README.md` 写清构建、产物路径、原生接入步骤摘要；根 README 提及配置字段。

---

## 10. 后续演进（备忘）

- `rainbow.call(method, params) → Promise` + 原生 handler 注册表
- `rainbow.on(event, handler)` 原生事件推送
- 与 `configuration/` 对齐版本号，构建后同步 SDK 与 `webview.json` 到各端
- 为 `vue` 提供可选 `types/rainbow.d.ts`，方便业务调用
- `allowedSchemes`、通配 host、按端覆盖
- 文档：`docs/sdk-bridge.md` 完整协议

---

## 11. 参考路径（现状）

| 路径 | 用途 |
|------|------|
| `sdk/` | SDK 工程（待实现） |
| `vue/` | H5 业务；远期可调用 `rainbow` |
| `native/android/.../MainActivity.kt` | Android WebView |
| `native/ios/ios/ViewController.m` | iOS WKWebView |
| `native/ohos/.../Index.ets` | 鸿蒙 Web |
| `native/macOS/.../ViewController.m` | macOS WKWebView |
| `native/wechat-miniapp/...` | 小程序 web-view（注入受限） |
| `configuration/webview.json` | **目标页 `url` + 域名白名单 `allowedHosts`（唯一真相源）** |

---

*更新日期：2026-11-19 · 对齐「纯 JS SDK + 原生植入 + rainbow 系统名 Demo」；补充 `configuration/webview.json`（目标页与白名单同文件）约定。*
