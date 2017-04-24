const fetch = require('node-fetch');

const DEFAULT_INFO = {
  site: 'bilibili',
  id: '',
  begin: '',
  official: false,
  premuiumOnly: false,
  censored: false,
  lang: 'zh-Hans',
  comment: '',
};

/**
 * 获取放送时间、是否官方、是否收费
 * @param  {Number} seasonId 番剧 ID
 * @return {Object}          放送时间（ISO 8601 格式）、是否官方、是否收费
 */
function getInfo(seasonId) {
  const api = `https://bangumi.bilibili.com/jsonp/seasoninfo/${seasonId}.ver`;
  return fetch(api)
    .then(res => res.text())
    .then(text => (
      /^seasonListCallback/.test(text)
        ? text.match(/seasonListCallback\((.*)\);/)[1]
        : text
    ))
    .then(JSON.parse)
    .then(({ code, message, result }) => {
      if (code) {
        return Promise.reject(new Error(message));
      }
      const pubTime = new Date(`${result.pub_time} +08:00`).toISOString() || '';
      return {
        // 开播前 pub_time 不准确
        begin: result.episodes.length ? pubTime : '',
        official: result.copyright === 'bilibili' ||
          result.copyright === 'dujia' ||
          result.copyright === 'cooperate',
        premuiumOnly: !!(result.payment && result.payment.price * 1),
      };
    });
}

module.exports = id =>
  getInfo(id)
    .catch(console.log)
    .then(info => Object.assign({}, DEFAULT_INFO, { id }, info));
