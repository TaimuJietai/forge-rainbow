import { webview } from '@kit.ArkWeb';

const WEB_URL = 'https://dv.phb.plus/';

@Entry
@Component
struct Index {
  private controller: webview.WebviewController = new webview.WebviewController();

  build() {
    Column() {
      Web({ src: WEB_URL, controller: this.controller })
        .javaScriptAccess(true)
        .domStorageAccess(true)
        .fileAccess(true)
        .imageAccess(true)
        .mixedMode(MixedMode.All)
        .width('100%')
        .height('100%')
    }
    .width('100%')
    .height('100%')
  }
}
