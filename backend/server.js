const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const ACCOUNTS_FILE = path.join(DATA_DIR, 'accounts.json');
const PASSCODES_FILE = path.join(DATA_DIR, 'passcodes.json');

// 初始化文件
if (!fs.existsSync(ACCOUNTS_FILE)) fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify([], null, 2));
if (!fs.existsSync(PASSCODES_FILE)) fs.writeFileSync(PASSCODES_FILE, JSON.stringify({ passcode: '', expiry: null }, null, 2));

function loadAccounts() {
  return JSON.parse(fs.readFileSync(ACCOUNTS_FILE, 'utf8'));
}
function saveAccounts(accounts) {
  fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(accounts, null, 2));
}
function loadPasscode() {
  return JSON.parse(fs.readFileSync(PASSCODES_FILE, 'utf8'));
}
function savePasscode(pc) {
  fs.writeFileSync(PASSCODES_FILE, JSON.stringify(pc, null, 2));
}

// 每天 00:00 清空 today_device
cron.schedule('0 0 * * *', () => {
  let accounts = loadAccounts();
  accounts.forEach(u => { u.today_device = ''; });
  saveAccounts(accounts);
  console.log('✅ 每天清空 today_device 完成');
});

app.use(cors());
app.use(bodyParser.json());

// 1. 登录
app.post('/api/login', (req, res) => {
  const { account, password, deviceId } = req.body;
  let accounts = loadAccounts();
  const user = accounts.find(u => u.account === account && u.password === password);
  if (!user) return res.json({ success: false, msg: '账号或密码错误' });

  res.json({ success: true, user: { account: user.account } });
});

// 2. 验证临时口令并签到
app.post('/api/check_passcode', (req, res) => {
  const { account, passcode, deviceId } = req.body;
  if (!account || !passcode || !deviceId) return res.json({ success: false, msg: '参数不完整' });

  // 校验口令
  const pc = loadPasscode();
  if (!pc.passcode || pc.passcode !== passcode || new Date(pc.expiry) < new Date()) {
    return res.json({ success: false, msg: '口令错误或已过期' });
  }

  // 校验/绑定设备
  let accounts = loadAccounts();
  const userIndex = accounts.findIndex(u => u.account === account);
  if (userIndex === -1) return res.json({ success: false, msg: '账号不存在' });

  const user = accounts[userIndex];
  if (user.today_device && user.today_device !== deviceId) {
    return res.json({ success: false, msg: '该账号已在其他设备签到（当天仅限本机）' });
  }

  // 允许签到并绑定设备（第一次绑定，后续多次签到也允许）
  if (!user.today_device) {
    user.today_device = deviceId;
    user.last_attendance = new Date().toISOString();
    saveAccounts(accounts);
  }

  res.json({ success: true, msg: '签到成功！' });
});

// 3. 管理员设置临时口令（Postman 调用即可）
app.post('/api/set_passcode', (req, res) => {
  const { passcode, duration_min = 30 } = req.body;
  if (!passcode) return res.json({ success: false, msg: '口令不能为空' });

  const expiry = new Date(Date.now() + duration_min * 60 * 1000);
  savePasscode({ passcode, expiry: expiry.toISOString() });
  res.json({ success: true, msg: `口令设置成功，有效期 ${duration_min} 分钟` });
});

app.listen(PORT, () => {
  console.log(`✅ 后端启动成功 http://localhost:${PORT}`);
  console.log('管理员提示：');
  console.log('1. 编辑 backend/data/accounts.json 添加账号');
  console.log('2. 用 Postman 调用 /api/set_passcode 设置临时口令');
});