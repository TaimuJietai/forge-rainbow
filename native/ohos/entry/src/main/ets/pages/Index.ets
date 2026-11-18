import { webview } from '@kit.ArkWeb';

const WEB_URL: string = 'https://dv.phb.plus/';
const OVERLAY_FADE_MS: number = 350;
const LOADING_FADE_MS: number = 250;

@Entry
@Component
struct Index {
  private controller: webview.WebviewController = new webview.WebviewController();
  @State webStarted: boolean = false;
  @State showCover: boolean = true;
  @State logoOpacity: number = 1;
  @State loadingOpacity: number = 0;
  @State coverOpacity: number = 1;
  @State buttonOpacity: number = 1;
  private didShowLoading: boolean = false;
  private didDismissCover: boolean = false;

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
        Web({ src: WEB_URL, controller: this.controller })
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
          .expandSafeArea([SafeAreaType.SYSTEM], [SafeAreaEdge.TOP, SafeAreaEdge.BOTTOM])
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
