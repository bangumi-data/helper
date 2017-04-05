const fetch = require('node-fetch');

/**
 * 获取放送时间与是否正版
 * @param  {String} vid 第一集 ID
 * @return {Object}     放送时间（ISO 8601 格式）和是否正版
 */
function getInfo(vid) {
  if (!vid) {
    return Promise.resolve({});
  }
  // 这个 API 中 data.show.pay 不准确，不能作为 premuiumOnly
  const api = `http://play.youku.com/play/get.json?ct=60&vid=${vid}`;
  return fetch(api)
    .then(res => res.json())
    .then(({ data }) => {
      const begin = new Date(data.video.published_time).toISOString() || '';
      return {
        // 放送开始前不准确
        begin: new Date(begin) < Date.now() ? begin : '',
        official: data.show && data.show.copyright * 1 === 1,
      };
    });
}

module.exports = { getInfo };
