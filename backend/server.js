const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');

const app = express();
const PORT = process.env.PORT || 3000;

// 数据目录
const DATA_DIR = path.join(__dirname, 'data');
const CLASSES_DIR = path.join(DATA_DIR, 'classes');
const COUNSELORS_FILE = path.join(DATA_DIR, 'counselors.json');

// 确保目录存在
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(CLASSES_DIR)) fs.mkdirSync(CLASSES_DIR, { recursive: true });

// ========== 初始化数据文件 ==========

// 辅导员账号（独立文件）
if (!fs.existsSync(COUNSELORS_FILE)) {
  const defaultCounselors = [
    { account: "counselor", password: "counsel123", name: "辅导员", deviceId: "", todayDeviceId: "", role: "counselor" }
  ];
  fs.writeFileSync(COUNSELORS_FILE, JSON.stringify(defaultCounselors, null, 2));
}

// 示例班级
const sampleClassDir = path.join(CLASSES_DIR, 'class_2024');
if (!fs.existsSync(sampleClassDir)) {
  fs.mkdirSync(sampleClassDir, { recursive: true });

  const sampleAccounts = [
    { account: "admin001", password: "admin123", name: "班长A", role: "admin", deviceId: "", todayDeviceId: "" },
    { account: "admin002", password: "admin123", name: "班长B", role: "admin", deviceId: "", todayDeviceId: "" },
    { account: "2023001", password: "123456", name: "张三", role: "student", deviceId: "", todayDeviceId: "" },
    { account: "2023002", password: "123456", name: "李四", role: "student", deviceId: "", todayDeviceId: "" },
    { account: "2023003", password: "123456", name: "王五", role: "student", deviceId: "", todayDeviceId: "" }
  ];
  fs.writeFileSync(path.join(sampleClassDir, 'accounts.json'), JSON.stringify(sampleAccounts, null, 2));

  const samplePasscode = { passcode: "", latitude: null, longitude: null, publishTime: null, expiryMinutes: 30 };
  fs.writeFileSync(path.join(sampleClassDir, 'passcode.json'), JSON.stringify(samplePasscode, null, 2));

  const sampleAttendance = [];
  fs.writeFileSync(path.join(sampleClassDir, 'attendance.json'), JSON.stringify(sampleAttendance, null, 2));
}

// ========== 工具函数 ==========

function loadCounselors() {
  return JSON.parse(fs.readFileSync(COUNSELORS_FILE, 'utf8'));
}
function saveCounselors(data) {
  fs.writeFileSync(COUNSELORS_FILE, JSON.stringify(data, null, 2));
}

function getClassDir(classId) {
  return path.join(CLASSES_DIR, classId);
}

function loadClassAccounts(classId) {
  const file = path.join(getClassDir(classId), 'accounts.json');
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}
function saveClassAccounts(classId, data) {
  fs.writeFileSync(path.join(getClassDir(classId), 'accounts.json'), JSON.stringify(data, null, 2));
}

function loadClassPasscode(classId) {
  const file = path.join(getClassDir(classId), 'passcode.json');
  if (!fs.existsSync(file)) return { passcode: "", latitude: null, longitude: null, publishTime: null, expiryMinutes: 30 };
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}
function saveClassPasscode(classId, data) {
  fs.writeFileSync(path.join(getClassDir(classId), 'passcode.json'), JSON.stringify(data, null, 2));
}

function loadClassAttendance(classId) {
  const file = path.join(getClassDir(classId), 'attendance.json');
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}
function saveClassAttendance(classId, data) {
  fs.writeFileSync(path.join(getClassDir(classId), 'attendance.json'), JSON.stringify(data, null, 2));
}

function getClassList() {
  if (!fs.existsSync(CLASSES_DIR)) return [];
  const dirs = fs.readdirSync(CLASSES_DIR).filter(d => d.startsWith('class_'));
  return dirs.map(d => d.replace('class_', ''));
}

// ========== 定时任务：每天 0 点重置 ==========
cron.schedule('0 0 * * *', () => {
  // 重置班级账号
  const classIds = getClassList();
  classIds.forEach(classId => {
    const accounts = loadClassAccounts(classId);
    accounts.forEach(a => { a.todayDeviceId = ''; });
    saveClassAccounts(classId, accounts);

    // 重置口令和签到
    saveClassPasscode(classId, { passcode: "", latitude: null, longitude: null, publishTime: null, expiryMinutes: 30 });
    saveClassAttendance(classId, []);
  });

  // 重置辅导员设备
  const counselors = loadCounselors();
  counselors.forEach(c => { c.todayDeviceId = ''; });
  saveCounselors(counselors);

  console.log('✅ 每日重置完成');
});

app.use(cors());
app.use(bodyParser.json());

// ========== API ==========

// 1. 登录
app.post('/api/login', (req, res) => {
  const { account, password, deviceId, role } = req.body;

  // 先检查辅导员
  const counselors = loadCounselors();
  const counselor = counselors.find(c => c.account === account && c.password === password);
  if (counselor) {
    if (role !== 'counselor') return res.json({ success: false, msg: '身份选择错误' });

    // 检查设备绑定（永久设备）
    if (counselor.deviceId && counselor.deviceId !== deviceId) {
      return res.json({ success: false, msg: '账号已在其他设备登录' });
    }

    // 绑定设备
    if (!counselor.deviceId) {
      counselor.deviceId = deviceId;
      saveCounselors(counselors);
    }

    return res.json({
      success: true,
      user: { account: counselor.account, name: counselor.name, role: counselor.role, classId: null }
    });
  }

  // 检查班级账号
  const classIds = getClassList();
  for (const classId of classIds) {
    const accounts = loadClassAccounts(classId);
    const user = accounts.find(u => u.account === account && u.password === password);
    if (user) {
      if (user.role !== role) return res.json({ success: false, msg: '身份选择错误' });

      // 检查设备绑定（永久设备）
      if (user.deviceId && user.deviceId !== deviceId) {
        return res.json({ success: false, msg: '账号已在其他设备登录' });
      }

      // 绑定设备
      if (!user.deviceId) {
        user.deviceId = deviceId;
        saveClassAccounts(classId, accounts);
      }

      return res.json({
        success: true,
        user: { account: user.account, name: user.name, role: user.role, classId }
      });
    }
  }

  res.json({ success: false, msg: '账号或密码错误' });
});

// 2. 获取班级列表（辅导员）
app.get('/api/classes', (req, res) => {
  const classIds = getClassList();
  const classes = classIds.map(id => {
    const accounts = loadClassAccounts(id);
    const passcode = loadClassPasscode(id);
    const attendance = loadClassAttendance(id);
    return {
      classId: id,
      studentCount: accounts.filter(a => a.role === 'student').length,
      adminCount: accounts.filter(a => a.role === 'admin').length,
      hasPasscode: !!passcode.passcode,
      attendanceCount: attendance.length
    };
  });
  res.json({ success: true, classes });
});

// 3. 创建班级（辅导员）
app.post('/api/classes', (req, res) => {
  const { classId } = req.body;
  if (!classId) return res.json({ success: false, msg: '班级ID不能为空' });

  const dir = getClassDir(classId);
  if (fs.existsSync(dir)) return res.json({ success: false, msg: '班级已存在' });

  fs.mkdirSync(dir, { recursive: true });
  saveClassAccounts(classId, []);
  saveClassPasscode(classId, { passcode: "", latitude: null, longitude: null, publishTime: null, expiryMinutes: 30 });
  saveClassAttendance(classId, []);

  res.json({ success: true, msg: '班级创建成功' });
});

// 4. 删除班级（辅导员）
app.delete('/api/classes/:classId', (req, res) => {
  const { classId } = req.params;
  const dir = getClassDir(classId);
  if (!fs.existsSync(dir)) return res.json({ success: false, msg: '班级不存在' });

  fs.rmSync(dir, { recursive: true, force: true });
  res.json({ success: true, msg: '班级已删除' });
});

// 5. 获取班级账号列表（辅导员/班长）
app.get('/api/classes/:classId/accounts', (req, res) => {
  const { classId } = req.params;
  const accounts = loadClassAccounts(classId);
  // 不返回密码
  const safeAccounts = accounts.map(a => ({
    account: a.account,
    name: a.name,
    role: a.role,
    hasDevice: !!a.deviceId
  }));
  res.json({ success: true, accounts: safeAccounts });
});

// 6. 添加账号（辅导员）
app.post('/api/classes/:classId/accounts', (req, res) => {
  const { classId } = req.params;
  const { account, password, name, role } = req.body;
  if (!account || !password || !name || !role) return res.json({ success: false, msg: '参数不完整' });

  const accounts = loadClassAccounts(classId);
  if (accounts.find(a => a.account === account)) return res.json({ success: false, msg: '账号已存在' });

  accounts.push({ account, password, name, role, deviceId: "", todayDeviceId: "" });
  saveClassAccounts(classId, accounts);

  res.json({ success: true, msg: '账号添加成功' });
});

// 7. 编辑账号（辅导员）
app.put('/api/classes/:classId/accounts/:account', (req, res) => {
  const { classId, account } = req.params;
  const { password, name, role } = req.body;

  const accounts = loadClassAccounts(classId);
  const index = accounts.findIndex(a => a.account === account);
  if (index === -1) return res.json({ success: false, msg: '账号不存在' });

  if (password) accounts[index].password = password;
  if (name) accounts[index].name = name;
  if (role) accounts[index].role = role;

  saveClassAccounts(classId, accounts);
  res.json({ success: true, msg: '账号更新成功' });
});

// 8. 删除账号（辅导员）
app.delete('/api/classes/:classId/accounts/:account', (req, res) => {
  const { classId, account } = req.params;
  const accounts = loadClassAccounts(classId);
  const index = accounts.findIndex(a => a.account === account);
  if (index === -1) return res.json({ success: false, msg: '账号不存在' });

  accounts.splice(index, 1);
  saveClassAccounts(classId, accounts);

  res.json({ success: true, msg: '账号已删除' });
});

// 9. 发布口令（辅导员/管理员）
app.post('/api/classes/:classId/passcode', (req, res) => {
  const { classId } = req.params;
  const { passcode, latitude, longitude } = req.body;
  if (!passcode) return res.json({ success: false, msg: '口令不能为空' });

  const passcodeData = {
    passcode,
    latitude: latitude || null,
    longitude: longitude || null,
    publishTime: new Date().toISOString(),
    expiryMinutes: 30
  };

  saveClassPasscode(classId, passcodeData);
  saveClassAttendance(classId, []); // 清空签到记录

  res.json({ success: true, msg: '口令发布成功' });
});

// 10. 清除口令（辅导员/管理员）
app.delete('/api/classes/:classId/passcode', (req, res) => {
  const { classId } = req.params;
  saveClassPasscode(classId, { passcode: "", latitude: null, longitude: null, publishTime: null, expiryMinutes: 30 });
  saveClassAttendance(classId, []);

  res.json({ success: true, msg: '口令已清除' });
});

// 11. 获取班级口令状态
app.get('/api/classes/:classId/passcode', (req, res) => {
  const { classId } = req.params;
  const passcode = loadClassPasscode(classId);
  const attendance = loadClassAttendance(classId);
  res.json({ success: true, passcode, attendanceCount: attendance.length });
});

// 12. 签到（学生）
app.post('/api/classes/:classId/checkin', (req, res) => {
  const { classId } = req.params;
  const { account, passcode, deviceId } = req.body;

  const accounts = loadClassAccounts(classId);
  const user = accounts.find(a => a.account === account);
  if (!user) return res.json({ success: false, msg: '账号不存在' });

  const passcodeData = loadClassPasscode(classId);

  // 验证口令
  if (!passcodeData.passcode || passcodeData.passcode !== passcode) {
    return res.json({ success: false, msg: '口令错误' });
  }

  // 验证过期
  if (passcodeData.publishTime) {
    const publishTime = new Date(passcodeData.publishTime).getTime();
    const now = Date.now();
    const expiryMs = (passcodeData.expiryMinutes || 30) * 60 * 1000;
    if (now - publishTime > expiryMs) {
      return res.json({ success: false, msg: '口令已过期' });
    }
  }

  // 验证当天设备（签到时绑定）
  if (user.todayDeviceId && user.todayDeviceId !== deviceId) {
    return res.json({ success: false, msg: '请使用首次签到的设备' });
  }

  // 绑定当天设备
  if (!user.todayDeviceId) {
    user.todayDeviceId = deviceId;
    saveClassAccounts(classId, accounts);
  }

  // 记录签到
  const attendance = loadClassAttendance(classId);
  if (attendance.find(a => a.account === account)) {
    return res.json({ success: false, msg: '您已签到' });
  }

  const now = new Date();
  attendance.push({
    account,
    name: user.name,
    time: `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`,
    checkInTime: now.toISOString()
  });
  saveClassAttendance(classId, attendance);

  res.json({ success: true, msg: '签到成功' });
});

// 13. 获取签到名单（辅导员/管理员）
app.get('/api/classes/:classId/attendance', (req, res) => {
  const { classId } = req.params;
  const attendance = loadClassAttendance(classId);
  res.json({ success: true, attendance });
});

// 14. 获取签到状态（学生查询自己）
app.get('/api/classes/:classId/attendance/:account', (req, res) => {
  const { classId, account } = req.params;
  const attendance = loadClassAttendance(classId);
  const hasCheckedIn = attendance.some(a => a.account === account);
  res.json({ success: true, hasCheckedIn });
});

app.listen(PORT, () => {
  console.log(`✅ 后端启动成功 http://localhost:${PORT}`);
  console.log('📋 初始账号：');
  console.log('   辅导员: counselor / counsel123');
  console.log('   班长: admin001 / admin123 (班级: class_2024)');
  console.log('   学生: 2023001 / 123456 (班级: class_2024)');
});
