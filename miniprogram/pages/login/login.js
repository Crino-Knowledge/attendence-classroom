const app = getApp();

Page({
  data: {
    role: 'student',
    account: '',
    password: ''
  },

  onLoad() {
    // 检查是否已登录
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      wx.redirectTo({ url: '/pages/home/home' });
    }
  },

  // 选择身份
  selectRole(e) {
    this.setData({ role: e.currentTarget.dataset.role });
  },

  // 输入账号
  onAccountInput(e) {
    this.setData({ account: e.detail.value });
  },

  // 输入密码
  onPasswordInput(e) {
    this.setData({ password: e.detail.value });
  },

  // 登录
  async login() {
    const { account, password, role } = this.data;

    if (!account || !password) {
      wx.showToast({ title: '请填写完整', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '登录中...' });

    try {
      const res = await app.login(account, password, role);

      if (res.success) {
        // 保存用户信息
        const userInfo = res.user;
        wx.setStorageSync('userInfo', userInfo);
        app.globalData.userInfo = userInfo;

        wx.hideLoading();
        wx.showToast({ title: '登录成功', icon: 'success' });

        setTimeout(() => {
          wx.redirectTo({ url: '/pages/home/home' });
        }, 1000);
      } else {
        wx.hideLoading();
        wx.showToast({ title: res.msg || '登录失败', icon: 'none' });
      }
    } catch (e) {
      wx.hideLoading();
      wx.showToast({ title: '网络错误', icon: 'none' });
    }
  }
});
