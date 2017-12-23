const fetch = require('node-fetch');
const cheerio = require('cheerio');

function getUtid() {
  const api = 'https://log.mmstat.com/eg.js';
  return fetch(api)
    .then(res => res.text())
    .then(text => text.match(/goldlog\.Etag="(.+?)";/)[1]);
}

/**
 * 获取是否正版
 * @param  {String} vid 第一集 ID
 * @return {Object}     是否正版
 */
async function getOfficial(vid) {
  if (!vid) {
    return {};
  }
  const utid = await getUtid();
  // 这个 API 中 data.show.pay 不准确，不能作为 premuiumOnly
  const api = `https://ups.youku.com/ups/get.json?vid=${vid}&ccode=0508&client_ip=192.168.1.1&utid=${utid}&client_ts=${new Date() / 1e3 | 0}`;
  return fetch(api, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.101 Safari/537.36',
      Referer: 'http://v.youku.com',
    },
  })
    .then(res => res.json())
    .then(({ data }) => ({
      official: !!(data.show && data.show.copyright * 1 === 1),
    }));
}

/**
 * 获取第一集 ID 和放送时间
 * @param  {String} proId 番剧 ID
 * @return {String}       第一集 ID 和放送时间
 */
function getVid(proId) {
  const CLIENT_ID = 'f8c97cdf52e7a346';
  const api = `https://openapi.youku.com/v2/shows/videos.json?client_id=${CLIENT_ID}&show_id=${proId}&count=1`;
  return fetch(api)
    .then(res => res.json())
    .then(({ videos }) => (
      videos.length
        ? {
          vid: videos[0].id,
          begin: new Date(`${videos[0].published}+08:00`).toISOString(),
          exist: true,
        }
        : { exist: false }
    ));
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
    .then($ => ({ premuiumOnly: !!$('.vip-free').length }));
}

module.exports = async (rawId) => {
  const id = rawId.slice(-20);
  let info = {};
  try {
    const { vid, begin = '', exist } = await getVid(id);
    const { official = null } = await getOfficial(vid);
    const { premuiumOnly = null } = await getPremuiumOnly(id);
    info = {
      begin,
      official,
      premuiumOnly,
      exist,
    };
  } catch (e) {
    console.log(e);
  }
  return Object.assign({ site: 'youku', id }, info);
};
