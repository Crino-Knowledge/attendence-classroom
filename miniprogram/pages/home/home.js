const { request } = require('../../utils/request');

Page({
  data: {
    userInfo: {},
    passcode: ''
  },
  onLoad() {
    const userInfo = wx.getStorageSync('userInfo') || getApp().globalData.userInfo;
    if (!userInfo) {
      wx.redirectTo({ url: '/pages/login/login' });
      return;
    }
    this.setData({ userInfo });
  },
  onPasscodeInput(e) { this.setData({ passcode: e.detail.value.trim() }); },

  async checkPasscode() {
    const { passcode, userInfo } = this.data;
    if (!passcode) return wx.showToast({ title: '请输入口令', icon: 'none' });

    wx.showLoading({ title: '签到中...' });
    try {
      const res = await request('/api/check_passcode', {
        account: userInfo.account,
        passcode,
        deviceId: userInfo.deviceId
      });
      if (res.success) {
        wx.showToast({ title: '签到成功！', icon: 'success' });
      } else {
        wx.showToast({ title: res.msg || '签到失败', icon: 'none' });
      }
    } catch (e) {
      wx.showToast({ title: '网络错误', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  logout() {
    wx.clearStorageSync();
    wx.redirectTo({ url: '/pages/login/login' });
  }
});