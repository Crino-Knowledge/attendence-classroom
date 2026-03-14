# 设备 ID 位置说明

本文档说明如何手动重置账号的设备绑定。

## 数据文件位置

所有数据存储在 `backend/data/` 目录下：

```
backend/data/
├── counselors.json          # 辅导员账号
└── classes/
    └── class_xxxx/
        └── accounts.json    # 班级学生账号
```

## 重置设备绑定

### 方法一：重置单个账号

编辑对应文件，找到对应账号，将 `deviceId` 字段设置为空字符串 `""`。

#### 辅导员账号

文件：`backend/data/counselors.json`

```json
[
  {
    "account": "counselor",
    "password": "counsel123",
    "name": "辅导员",
    "deviceId": "",        // 清空此字段
    "todayDeviceId": "",   // 清空此字段
    "role": "counselor"
  }
]
```

#### 班级账号

文件：`backend/data/classes/class_xxxx/accounts.json`

```json
[
  {
    "account": "2023001",
    "password": "123456",
    "name": "张三",
    "role": "student",
    "deviceId": "",        // 清空此字段
    "todayDeviceId": ""    // 清空此字段
  }
]
```

### 方法二：重置所有账号（每日自动执行）

系统每天 0 点会自动重置所有账号的 `todayDeviceId`（当日设备绑定），但不会重置 `deviceId`（永久设备绑定）。

如果需要完全重置，可以手动修改上述文件。

## 字段说明

| 字段 | 说明 |
|------|------|
| `deviceId` | 永久设备绑定，首次登录时自动绑定，之后不可在其他设备登录 |
| `todayDeviceId` | 当日设备绑定，每天 0 点自动清空，允许当天换设备签到（需口令验证） |

## 注意事项

1. 修改 JSON 文件时，请保持 JSON 格式正确（使用文本编辑器，不要使用 Word）
2. 修改后保存文件即可，无需重启服务
3. 如需立即生效，可以重启后端服务：`Ctrl+C` 然后 `node server.js`
