import { webview } from '@kit.ArkWeb';
import { util } from '@kit.ArkTS';
import { common } from '@kit.AbilityKit';
import { WebViewHostBridge } from '../bridge/WebViewHostBridge';

const OVERLAY_FADE_MS: number = 350;
const LOADING_FADE_MS: number = 250;
const FALLBACK_URL: string = 'https://dv.phb.plus/';
const BRIDGE_NAME: string = 'kWHScriptHandlerName';

interface WebViewJsonConfig {
  url?: string;
  allowedHosts?: string[];
}

/** 文档起始注入项（API 因 SDK 版本可能无 webview.ScriptItem 导出，本地声明） */
interface DocumentStartScriptItem {
  script: string;
  scriptRules: string[];
}

@Entry
@Component
struct Index {
  private controller: webview.WebviewController = new webview.WebviewController();
  private bridge: WebViewHostBridge = new WebViewHostBridge();
  @State webStarted: boolean = false;
  @State showCover: boolean = true;
  @State logoOpacity: number = 1;
  @State loadingOpacity: number = 0;
  @State coverOpacity: number = 1;
  @State buttonOpacity: number = 1;
  @State homeUrl: string = FALLBACK_URL;
  private allowedHosts: string[] = ['dv.phb.plus', 'cdn.phb.plus'];
  private documentStartScripts: Array<DocumentStartScriptItem> = [];
  private didShowLoading: boolean = false;
  private didDismissCover: boolean = false;

  aboutToAppear(): void {
    this.bridge.bindController(this.controller);
    this.loadWebViewConfig();
    this.prepareRainbowInjection();
  }

  private readRawFileText(path: string): string {
    try {
      const context = getContext(this) as common.UIAbilityContext;
      const data: Uint8Array = context.resourceManager.getRawFileContentSync(path);
      const decoder = util.TextDecoder.create('utf-8');
      return decoder.decodeToString(data);
    } catch (_e) {
      return '';
    }
  }

  private loadWebViewConfig(): void {
    const text = this.readRawFileText('configuration/webview.json');
    if (text.length === 0) {
      return;
    }
    try {
      const parsed = JSON.parse(text) as WebViewJsonConfig;
      if (parsed.url !== undefined && parsed.url.length > 0) {
        this.homeUrl = parsed.url;
      }
      if (parsed.allowedHosts !== undefined && parsed.allowedHosts.length > 0) {
        const next: string[] = [];
        for (let i = 0; i < parsed.allowedHosts.length; i++) {
          const host = parsed.allowedHosts[i];
          if (host !== undefined && host.length > 0) {
            next.push(host.toLowerCase());
          }
        }
        if (next.length > 0) {
          this.allowedHosts = next;
        }
      }
    } catch (_e) {
      // keep fallback
    }
  }

  private prepareRainbowInjection(): void {
    const sdk = this.readRawFileText('sdk/web-view-host.min.js');
    if (sdk.length === 0) {
      return;
    }
    const script: string = `window.__WVH_BOOT__={platform:'harmony'};${sdk}`;
    const rules: string[] = ['*'];
    const item: DocumentStartScriptItem = {
      script: script,
      scriptRules: rules,
    };
    this.documentStartScripts = [item];
  }

  private isHostAllowed(url: string): boolean {
    if (url.startsWith('about:') || url.startsWith('data:') || url.startsWith('blob:')) {
      return true;
    }
    let rest = url;
    const schemeIdx = url.indexOf('://');
    if (schemeIdx >= 0) {
      rest = url.substring(schemeIdx + 3);
    }
    const slashIdx = rest.indexOf('/');
    const hostPort = slashIdx >= 0 ? rest.substring(0, slashIdx) : rest;
    const atIdx = hostPort.lastIndexOf('@');
    const hostOnly = atIdx >= 0 ? hostPort.substring(atIdx + 1) : hostPort;
    const colonIdx = hostOnly.indexOf(':');
    const host = (colonIdx >= 0 ? hostOnly.substring(0, colonIdx) : hostOnly).toLowerCase();
    if (host.length === 0) {
      return false;
    }
    return this.allowedHosts.indexOf(host) >= 0;
  }

  private startWebView(): void {
    if (this.webStarted) {
      return;
    }
    this.webStarted = true;
    this.buttonOpacity = 0;
  }

  private showLoadingIfNeeded(): void {
    if (this.didShowLoading || this.didDismissCover || !this.showCover) {
      return;
    }
    this.didShowLoading = true;
    this.getUIContext().animateTo({ duration: LOADING_FADE_MS, curve: Curve.EaseInOut }, () => {
      this.logoOpacity = 0;
      this.loadingOpacity = 1;
    });
  }

  private dismissCoverIfNeeded(): void {
    if (this.didDismissCover || !this.showCover) {
      return;
    }
    this.didDismissCover = true;
    this.getUIContext().animateTo({
      duration: OVERLAY_FADE_MS,
      curve: Curve.EaseInOut,
      onFinish: () => {
        this.showCover = false;
      }
    }, () => {
      this.coverOpacity = 0;
    });
  }

  build() {
    Stack() {
      if (this.webStarted) {
        Web({ src: this.homeUrl, controller: this.controller })
          .width('100%')
          .height('100%')
          .backgroundColor(Color.Transparent)
          .javaScriptAccess(true)
          .domStorageAccess(true)
          .fileAccess(true)
          .imageAccess(true)
          .onlineImageAccess(true)
          .mixedMode(MixedMode.All)
          .zoomAccess(false)
          .javaScriptOnDocumentStart(this.documentStartScripts)
          .javaScriptProxy({
            object: this.bridge,
            name: BRIDGE_NAME,
            methodList: ['postMessage'],
            controller: this.controller,
          })
          .expandSafeArea([SafeAreaType.SYSTEM], [SafeAreaEdge.TOP, SafeAreaEdge.BOTTOM])
          .onLoadIntercept((event: OnLoadInterceptEvent) => {
            const url = event.data.getRequestUrl();
            // return true to intercept (block); false to allow
            if (url.length === 0) {
              return false;
            }
            return !this.isHostAllowed(url);
          })
          .onFirstContentfulPaint((_event: OnFirstContentfulPaintEvent) => {
            // 首份 HTML 已绘制：启动页切到 Loading，继续挡住未完成页面
            this.showLoadingIfNeeded();
          })
          .onProgressChange((event: OnProgressChangeEvent) => {
            // 兜底：已有加载进度时切 Loading（部分页面可能不触发 FCP）
            if (event.newProgress >= 20) {
              this.showLoadingIfNeeded();
            }
          })
          .onPageEnd((_event: OnPageEndEvent) => {
            // 整页加载完成后再关闭遮罩
            this.dismissCoverIfNeeded();
          })
          .onErrorReceive((_event: OnErrorReceiveEvent) => {
            this.dismissCoverIfNeeded();
          })
      }

      if (this.showCover) {
        Column() {
          Blank()

          Stack() {
            Image($r('app.media.splash_logo'))
              .width(160)
              .height(160)
              .objectFit(ImageFit.Contain)
              .opacity(this.logoOpacity)

            LoadingProgress()
              .width(48)
              .height(48)
              .color('#666666')
              .opacity(this.loadingOpacity)
          }
          .width(160)
          .height(160)

          Blank()

          if (!this.webStarted) {
            Button($r('app.string.enter_button'))
              .width(160)
              .height(44)
              .fontSize(16)
              .fontColor(Color.White)
              .backgroundColor('#3A7CA5')
              .borderRadius(22)
              .opacity(this.buttonOpacity)
              .margin({ bottom: 80 })
              .onClick(() => {
                this.startWebView();
              })
          } else {
            Blank()
              .height(124)
          }
        }
        .width('100%')
        .height('100%')
        .justifyContent(FlexAlign.Center)
        .alignItems(HorizontalAlign.Center)
        .backgroundColor($r('app.color.start_window_background'))
        .opacity(this.coverOpacity)
        .hitTestBehavior(HitTestMode.Default)
        .expandSafeArea([SafeAreaType.SYSTEM], [SafeAreaEdge.TOP, SafeAreaEdge.BOTTOM])
      }
    }
    .width('100%')
    .height('100%')
    .backgroundColor($r('app.color.start_window_background'))
    .expandSafeArea([SafeAreaType.SYSTEM], [SafeAreaEdge.TOP, SafeAreaEdge.BOTTOM])
  }
}
