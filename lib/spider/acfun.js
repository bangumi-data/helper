const cheerio = require('cheerio');
const fetch = require('node-fetch');

/**
 * 获取放送时间（年月日并不是第一集放送日期）
 * @param  {Number} bid 番剧 ID
 * @return {String}     放送时间，ISO 8601 格式
 */
function getBeginTime(bid) {
  const api = `http://www.acfun.tv/v/ab${bid}`;
  return fetch(api)
    .then(res => res.text())
    .then(cheerio.load)
    .then($ => new Date($('#date-title').data('date')).toISOString())
    .catch(console.log);
}

module.exports = function(id) {
  return getBeginTime(id)
    .then(beginTime => ({
      site: 'acfun',
      id,
      begin: beginTime
    }))
    .catch(console.log);
};
