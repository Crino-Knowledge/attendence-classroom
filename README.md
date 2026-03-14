# 课堂考勤微信小程序

## 后端部署
1. `cd backend && npm install`
2. `npm run dev` （开发）或 `npm start` （生产，建议用 pm2）
3. 修改 miniprogram/app.js 中的 baseUrl 为你的服务器地址
4. 管理员操作：
   - 编辑 data/accounts.json 添加/删除账号
   - 用 Postman 调用 POST /api/set_passcode 设置临时口令

## 小程序
1. 微信开发者工具 → 导入 miniprogram 文件夹
2. 上传代码审核（类目选“教育”）