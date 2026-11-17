@Entry
@Component
struct Index {
  build() {
    Column() {
      Text('Hello World')
        .fontSize(24)
        .fontWeight(FontWeight.Medium)
        .fontColor(Color.Black)
    }
    .width('100%')
    .height('100%')
    .justifyContent(FlexAlign.Center)
    .alignItems(HorizontalAlign.Center)
    .backgroundColor(Color.White)
  }
}
