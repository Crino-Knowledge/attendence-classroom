const { request } = require('./utils/request');
const { generateDeviceId } = require('./utils/device');

App({
  globalData: {
    baseUrl: 'http://localhost:3000',
    userInfo: null,
    deviceId: ''
  },

  onLaunch() {
    this.globalData.deviceId = generateDeviceId();
  },

  // 获取设备ID
  getDeviceId() {
    if (!this.globalData.deviceId) {
      this.globalData.deviceId = generateDeviceId();
    }
    return this.globalData.deviceId;
  },

  // 登录
  login(account, password, role) {
    const deviceId = this.getDeviceId();
    return request('/api/login', { account, password, deviceId, role });
  },

  // 获取班级列表（辅导员）
  getClasses() {
    return request('/api/classes', {});
  },

  // 创建班级
  createClass(classId) {
    return request('/api/classes', { classId });
  },

  // 删除班级
  deleteClass(classId) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: `${this.globalData.baseUrl}/api/classes/${classId}`,
        method: 'DELETE',
        success: res => resolve(res.data),
        fail: reject
      });
    });
  },

  // 获取班级账号
  getClassAccounts(classId) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: `${this.globalData.baseUrl}/api/classes/${classId}/accounts`,
        method: 'GET',
        success: res => resolve(res.data),
        fail: reject
      });
    });
  },

  // 添加账号
  addAccount(classId, account, password, name, role) {
    return request(`/api/classes/${classId}/accounts`, { account, password, name, role });
  },

  // 编辑账号
  updateAccount(classId, account, password, name, role) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: `${this.globalData.baseUrl}/api/classes/${classId}/accounts/${account}`,
        method: 'PUT',
        data: { password, name, role },
        header: { 'content-type': 'application/json' },
        success: res => resolve(res.data),
        fail: reject
      });
    });
  },

  // 删除账号
  deleteAccount(classId, account) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: `${this.globalData.baseUrl}/api/classes/${classId}/accounts/${account}`,
        method: 'DELETE',
        success: res => resolve(res.data),
        fail: reject
      });
    });
  },

  // 发布口令
  publishPasscode(classId, passcode, latitude, longitude) {
    return request(`/api/classes/${classId}/passcode`, { passcode, latitude, longitude });
  },

  // 清除口令
  clearPasscode(classId) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: `${this.globalData.baseUrl}/api/classes/${classId}/passcode`,
        method: 'DELETE',
        success: res => resolve(res.data),
        fail: reject
      });
    });
  },

  // 获取口令状态
  getPasscode(classId) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: `${this.globalData.baseUrl}/api/classes/${classId}/passcode`,
        method: 'GET',
        success: res => resolve(res.data),
        fail: reject
      });
    });
  },

  // 签到
  checkIn(classId, account, passcode) {
    const deviceId = this.getDeviceId();
    return request(`/api/classes/${classId}/checkin`, { account, passcode, deviceId });
  },

  // 获取签到名单
  getAttendance(classId) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: `${this.globalData.baseUrl}/api/classes/${classId}/attendance`,
        method: 'GET',
        success: res => resolve(res.data),
        fail: reject
      });
    });
  },

  // 获取签到状态
  getAttendanceStatus(classId, account) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: `${this.globalData.baseUrl}/api/classes/${classId}/attendance/${account}`,
        method: 'GET',
        success: res => resolve(res.data),
        fail: reject
      });
    });
  }
})
