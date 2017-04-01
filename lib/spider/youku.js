const fetch = require('node-fetch');
const cheerio = require('cheerio');

const { getInfo } = require('./youtu.js');

const DEFAULT_INFO = {
  site: 'youku',
  id: '',
  begin: '',
  official: false,
  premuiumOnly: false,
  censored: false,
  lang: 'zh-Hans',
  comment: '',
};

/**
 * 获取第一集 ID
 * @param  {String} acode 番剧 ID
 * @return {String}       第一集 ID
 */
function getVid(proId) {
  const CLIENT_ID = 'f8c97cdf52e7a346';
  const api = `https://openapi.youku.com/v2/shows/videos.json?client_id=${CLIENT_ID}&show_id=${proId}&count=1`;
  return fetch(api)
    .then(res => res.json())
    .then(({ videos }) => (videos.length ? videos[0].id : ''));
}

/**
 * 获取是否收费
 * @param  {String} acode 番剧 ID
 * @return {Boolean}      premuiumOnly
 */
function getPremuiumOnly(id) {
  const url = `https://list.youku.com/show/id_z${id}.html`;
  return fetch(url)
    .then(res => res.text())
    .then(cheerio.load)
    .then($ => !!$('.vip-free').length);
}

module.exports = id =>
  getVid(id)
    .then(getInfo)
    .then(info =>
      getPremuiumOnly(id)
        .then(premuiumOnly => Object.assign(info, { premuiumOnly }))
    )
    .catch(console.log)
    .then(info => Object.assign(DEFAULT_INFO, { id }, info));
