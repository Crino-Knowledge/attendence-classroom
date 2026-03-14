const generateDeviceId = () => {
  let deviceId = wx.getStorageSync('device_id');
  if (deviceId) return deviceId;

  const info = wx.getDeviceInfo();
  const hardware = `${info.brand}|${info.model}|${info.system}|${info.platform}`;
  const randomPart = 'dev_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);

  deviceId = hardware + '|' + randomPart;
  wx.setStorageSync('device_id', deviceId);
  return deviceId;
};

module.exports = { generateDeviceId };
