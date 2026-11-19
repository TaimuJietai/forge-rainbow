const WEB_URL = 'https://dv.phb.plus'

Page({
  data: {
    url: WEB_URL,
    showLoading: true,
  },

  onWebLoad() {
    this.setData({ showLoading: false })
  },

  onWebError() {
    this.setData({ showLoading: false })
    wx.showToast({
      title: '页面加载失败',
      icon: 'none',
    })
  },
})
