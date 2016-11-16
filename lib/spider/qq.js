const fetch = require('node-fetch');

/**
 * 获取放送时间
 * @param  {Number} id 番剧 ID
 * @return {String}     放送时间为文本，需之后手动处理
 */
function getBeginTime(id) {
  const api = `https://ncgi.video.qq.com/fcgi-bin/liveportal/follow_info?otype=json&t=1&id=${id}`;
  return fetch(api)
    .then(res => res.text())
    .then(text => JSON.parse(text.match(/QZOutputJson=(.*);$/)[1]))
    .then(json => json.follow[0].followdesc);
}

module.exports = function(id) {
  return getBeginTime(id.slice(2))
    .then(begin => ({ site: 'qq', id, begin }))
    .catch(console.log);
};
