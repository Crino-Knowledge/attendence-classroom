const baseUrl = 'http://localhost:3000';

const request = (url, data = {}, method = 'POST') => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: baseUrl + url,
      method,
      data,
      header: { 'content-type': 'application/json' },
      success: res => {
        if (res.statusCode === 200) {
          resolve(res.data);
        } else {
          reject(res);
        }
      },
      fail: reject
    });
  });
};

module.exports = { request };
