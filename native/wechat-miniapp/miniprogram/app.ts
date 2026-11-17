// app.ts
App<IAppOption>({
  globalData: {},
  onLaunch() {
    const logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)
  },
  onPageNotFound(res) {
    console.error('[app] page not found', res)
    wx.reLaunch({ url: '/pages/index/index' })
  },
})
