const fetch = require('node-fetch');

/**
 * 获取放送时间
 * @param  {Number} seasonId 番剧 ID
 * @return {String}          放送时间，ISO 8601 格式
 */
function getBeginTime(seasonId) {
  const api = `http://bangumi.bilibili.com/jsonp/seasoninfo/${seasonId}.ver`;
  return fetch(api)
    .then(res => res.text())
    .then(text => (
      /^seasonListCallback/.test(text)
        ? text.match(/seasonListCallback\((.*)\);/)[1]
        : text
    ))
    .then(JSON.parse)
    .then(json => {
      if (json.code) {
        return Promise.reject(new Error(json.message));
      }
      return json.result.episodes
        .map(ep => new Date(ep['update_time']).toISOString())
        .sort()
        .shift();
    });
}

module.exports = function(id) {
  return getBeginTime(id)
    .then(beginTime => ({
      site: 'bilibili',
      id,
      begin: beginTime
    }))
    .catch(console.log);
};
