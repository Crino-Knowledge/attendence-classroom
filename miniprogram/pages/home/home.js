const app = getApp();

Page({
  data: {
    userInfo: {},
    roleText: '',
    isCounselor: false,
    isAdmin: false,
    // 辅导员
    classes: [],
    // 管理员/学生
    classId: '',
    passcode: '',
    withLocation: true,
    currentPasscode: {},
    publishTimeText: '',
    attendanceCount: 0,
    attendanceList: [],
    accounts: [],
    hasCheckedIn: false,
    // 班级选择
    showClassPicker: false,
    classList: [],
    // 账号管理弹窗
    showAccountModal: false,
    editingAccount: null,
    modalAccount: '',
    modalName: '',
    modalPassword: '',
    modalRoleIndex: 0,
    roleOptions: ['学生', '管理员']
  },

  async onLoad() {
    const userInfo = wx.getStorageSync('userInfo');
    if (!userInfo) {
      wx.redirectTo({ url: '/pages/login/login' });
      return;
    }

    const isCounselor = userInfo.role === 'counselor';
    const isAdmin = userInfo.role === 'admin';

    const roleTextMap = {
      counselor: '辅导员',
      admin: '管理员',
      student: '学生'
    };

    this.setData({
      userInfo,
      isCounselor,
      isAdmin,
      roleText: roleTextMap[userInfo.role]
    });

    if (isCounselor) {
      await this.loadClasses();
    } else if (userInfo.classId) {
      this.setData({ classId: userInfo.classId });
      await this.loadData();
    }
  },

  // ========== 辅导员：班级管理 ==========

  async loadClasses() {
    try {
      const res = await app.getClasses();
      if (res.success) {
        this.setData({ classes: res.classes, classList: res.classes.map(c => c.classId) });
      }
    } catch (e) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  async createClass() {
    wx.showModal({
      title: '创建班级',
      placeholderText: '请输入班级ID',
      editable: true,
      success: async (res) => {
        if (res.confirm && res.content) {
          try {
            const result = await app.createClass(res.content);
            wx.showToast({ title: result.msg, icon: 'none' });
            if (result.success) {
              this.loadClasses();
            }
          } catch (e) {
            wx.showToast({ title: '创建失败', icon: 'none' });
          }
        }
      }
    });
  },

  async deleteClass(e) {
    const classId = e.currentTarget.dataset.classid;
    wx.showModal({
      title: '确认删除',
      content: `确定要删除班级 ${classId} 吗？`,
      success: async (res) => {
        if (res.confirm) {
          try {
            const result = await app.deleteClass(classId);
            wx.showToast({ title: result.msg, icon: 'none' });
            this.loadClasses();
          } catch (e) {
            wx.showToast({ title: '删除失败', icon: 'none' });
          }
        }
      }
    });
  },

  selectClass(e) {
    const classId = e.currentTarget.dataset.classid;
    this.setData({ classId });
    this.loadData();
  },

  // ========== 通用：加载数据 ==========

  async loadData() {
    const { classId } = this.data;
    if (!classId) return;

    try {
      const [passcodeRes, attendanceRes, accountsRes] = await Promise.all([
        app.getPasscode(classId),
        app.getAttendance(classId),
        app.getClassAccounts(classId)
      ]);

      const currentPasscode = passcodeRes.passcode || {};
      let publishTimeText = '';
      if (currentPasscode.publishTime) {
        const date = new Date(currentPasscode.publishTime);
        publishTimeText = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
      }

      const hasCheckedIn = await app.getAttendanceStatus(classId, this.data.userInfo.account);

      this.setData({
        currentPasscode,
        publishTimeText,
        attendanceList: attendanceRes.attendance || [],
        attendanceCount: (attendanceRes.attendance || []).length,
        accounts: accountsRes.accounts || [],
        hasCheckedIn: hasCheckedIn.hasCheckedIn || false
      });
    } catch (e) {
      console.error(e);
    }
  },

  // ========== 口令发布 ==========

  onPasscodeInput(e) {
    this.setData({ passcode: e.detail.value.trim() });
  },

  onLocationChange(e) {
    this.setData({ withLocation: e.detail.value });
  },

  async publishPasscode() {
    const { passcode, withLocation, classId } = this.data;
    if (!passcode) {
      wx.showToast({ title: '请输入口令', icon: 'none' });
      return;
    }
    if (!classId) {
      wx.showToast({ title: '请选择班级', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '发布中...' });

    try {
      let latitude = null, longitude = null;
      if (withLocation) {
        await new Promise((resolve, reject) => {
          wx.getLocation({
            type: 'gcj02',
            success: (res) => {
              latitude = res.latitude;
              longitude = res.longitude;
              resolve();
            },
            fail: () => {
              wx.showToast({ title: '获取位置失败', icon: 'none' });
              reject();
            }
          });
        });
      }

      const result = await app.publishPasscode(classId, passcode, latitude, longitude);
      wx.showToast({ title: result.msg, icon: 'none' });
      if (result.success) {
        this.setData({ passcode: '' });
        this.loadData();
      }
    } catch (e) {
      // 已在 getLocation 失败时处理
    } finally {
      wx.hideLoading();
    }
  },

  async clearPasscode() {
    const { classId } = this.data;
    wx.showModal({
      title: '确认',
      content: '确定要清除当前口令吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            const result = await app.clearPasscode(classId);
            wx.showToast({ title: result.msg, icon: 'none' });
            this.loadData();
          } catch (e) {
            wx.showToast({ title: '清除失败', icon: 'none' });
          }
        }
      }
    });
  },

  // ========== 学生签到 ==========

  async checkIn() {
    const { passcode, classId, userInfo } = this.data;

    if (!passcode) {
      wx.showToast({ title: '请输入口令', icon: 'none' });
      return;
    }
    if (!classId) {
      wx.showToast({ title: '请选择班级', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '签到中...' });

    try {
      const result = await app.checkIn(classId, userInfo.account, passcode);
      wx.showToast({ title: result.msg, icon: 'none' });
      if (result.success) {
        this.loadData();
      }
    } catch (e) {
      wx.showToast({ title: '签到失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  // ========== 账号管理（辅导员） ==========

  showAddAccount() {
    this.setData({
      showAccountModal: true,
      editingAccount: null,
      modalAccount: '',
      modalName: '',
      modalPassword: '',
      modalRoleIndex: 0
    });
  },

  editAccount(e) {
    const index = e.currentTarget.dataset.index;
    const account = this.data.accounts[index];
    const roleIndex = account.role === 'admin' ? 1 : 0;

    this.setData({
      showAccountModal: true,
      editingAccount: index,
      modalAccount: account.account,
      modalName: account.name,
      modalPassword: '',
      modalRoleIndex: roleIndex
    });
  },

  async deleteAccount(e) {
    const index = e.currentTarget.dataset.index;
    const account = this.data.accounts[index];
    const { classId } = this.data;

    wx.showModal({
      title: '确认删除',
      content: `确定要删除账号 ${account.account} 吗？`,
      success: async (res) => {
        if (res.confirm) {
          try {
            const result = await app.deleteAccount(classId, account.account);
            wx.showToast({ title: result.msg, icon: 'none' });
            this.loadData();
          } catch (e) {
            wx.showToast({ title: '删除失败', icon: 'none' });
          }
        }
      }
    });
  },

  hideAccountModal() {
    this.setData({ showAccountModal: false });
  },

  onModalAccountInput(e) { this.setData({ modalAccount: e.detail.value }); },
  onModalNameInput(e) { this.setData({ modalName: e.detail.value }); },
  onModalPasswordInput(e) { this.setData({ modalPassword: e.detail.value }); },
  onRoleChange(e) { this.setData({ modalRoleIndex: e.detail.value }); },

  async saveAccount() {
    const { modalAccount, modalName, modalPassword, modalRoleIndex, editingAccount, classId } = this.data;

    if (!modalAccount || !modalName) {
      wx.showToast({ title: '请填写完整', icon: 'none' });
      return;
    }

    if (!modalPassword && editingAccount !== null) {
      wx.showToast({ title: '请输入密码', icon: 'none' });
      return;
    }

    const role = modalRoleIndex === 1 ? 'admin' : 'student';

    try {
      let result;
      if (editingAccount !== null) {
        // 编辑（不修改密码则传空）
        const password = modalPassword || null;
        result = await app.updateAccount(classId, modalAccount, password, modalName, role);
      } else {
        if (!modalPassword) {
          wx.showToast({ title: '请输入密码', icon: 'none' });
          return;
        }
        result = await app.addAccount(classId, modalAccount, modalPassword, modalName, role);
      }

      wx.showToast({ title: result.msg, icon: 'none' });
      if (result.success) {
        this.setData({ showAccountModal: false });
        this.loadData();
      }
    } catch (e) {
      wx.showToast({ title: '保存失败', icon: 'none' });
    }
  },

  // ========== 退出 ==========

  logout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('userInfo');
          wx.redirectTo({ url: '/pages/login/login' });
        }
      }
    });
  }
});
