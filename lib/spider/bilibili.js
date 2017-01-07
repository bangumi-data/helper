const fetch = require('node-fetch');

/**
 * 获取放送时间和是否官方
 * @param  {Number} seasonId 番剧 ID
 * @return {Object}          放送时间（ISO 8601 格式）和是否官方
 */
function getInfo(seasonId) {
  const api = `http://bangumi.bilibili.com/jsonp/seasoninfo/${seasonId}.ver`;
  return fetch(api)
    .then(res => res.text())
    .then(text => (
      /^seasonListCallback/.test(text)
        ? text.match(/seasonListCallback\((.*)\);/)[1]
        : text
    ))
    .then(JSON.parse)
    .then((json) => {
      if (json.code) {
        return Promise.reject(new Error(json.message));
      }
      return {
        begin: json.result.episodes
          .map(ep => new Date(ep.update_time).toISOString())
          .sort()
          .shift() || '',
        official: json.result.copyright === 'bilibili' ||
          json.result.copyright === 'dujia' ||
          json.result.copyright === 'cooperate',
      };
    });
}

module.exports = id =>
  getInfo(id)
    .then(info => Object.assign({ site: 'bilibili', id }, info))
    .catch(console.log);
