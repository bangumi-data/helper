const fetch = require('node-fetch');

/**
 * 获取放送时间、是否官方、是否收费
 * @param  {Number} seasonId 番剧 ID
 * @return {Object}
 */
function getInfo(seasonId) {
  const api = `https://bangumi.bilibili.com/jsonp/seasoninfo/${seasonId}.ver?callback=seasonListCallback`;
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
        throw new Error(message);
      }
      const pubTime = new Date(`${result.pub_time} +08:00`).toISOString() || '';
      return {
        // 开播前 pub_time 不准确
        begin: result.episodes.length ? pubTime : '',
        official: ['bilibili', 'dujia', 'cooperate'].includes(result.copyright),
        premuiumOnly: !!(result.payment && result.payment.price * 1),
        exist: !!result.episodes.length,
      };
    });
}

module.exports = async (id) => {
  let info = {};
  try {
    info = await getInfo(id);
  } catch (e) {
    console.log(e);
  }
  return Object.assign({ site: 'bilibili', id }, info);
};
