const fetch = require('node-fetch');

/**
 * 获取放送时间
 * @param  {String} vid 第一集 ID
 * @return {String}     放送时间，ISO 8601 格式
 */
function getBeginTime(vid) {
  const api = `http://play.youku.com/play/get.json?ct=60&vid=${vid}`;
  return fetch(api)
    .then(res => res.json())
    .then(json => new Date(json.data.video['published_time']).toISOString());
}

module.exports = { getBeginTime };
