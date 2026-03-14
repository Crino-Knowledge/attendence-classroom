const { request } = require('../../utils/request');
const { generateDeviceId } = require('../../utils/device');

Page({
  data: {
    account: '',
    password: ''
  },
  onAccountInput(e) { this.setData({ account: e.detail.value }); },
  onPasswordInput(e) { this.setData({ password: e.detail.value }); },

  async login() {
    const { account, password } = this.data;
    if (!account || !password) return wx.showToast({ title: '请填写完整', icon: 'none' });

    wx.showLoading({ title: '登录中...' });
    const deviceId = generateDeviceId();

    try {
      const res = await request('/api/login', { account, password, deviceId });
      if (res.success) {
        getApp().globalData.userInfo = { account: res.user.account, deviceId };
        wx.setStorageSync('userInfo', getApp().globalData.userInfo);
        wx.showToast({ title: '登录成功' });
        wx.redirectTo({ url: '/pages/home/home' });
      } else {
        wx.showToast({ title: res.msg || '登录失败', icon: 'none' });
      }
    } catch (e) {
      wx.showToast({ title: '网络错误', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  }
});