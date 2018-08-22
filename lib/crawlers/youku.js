const querystring = require('querystring');
const fetch = require('node-fetch');
const cheerio = require('cheerio');

const { getAllBangumi } = require('../utils.js');

exports._getAll = async function getAll() {
  // 优酷一个搜索条件最多显示 1200 项结果，故分多个搜索条件获得所有结果
  const conditions = [
    ...(() => {
      const cs = [];
      for (let year = new Date().getUTCFullYear(); year >= 2010; year--) {
        cs.push({ r: String(year), time: String(year) });
      }
      return cs;
    })(),
    { r: '2000', time: '00年代', av: '1', version: 'TV版' },
    { r: '2000', time: '00年代', av: '2', version: 'OVA版' },
    { r: '2000', time: '00年代', av: '3', version: '剧场版' },
    // { r: '2000', time: '00年代', av: '4', version: '真人版' },
    { r: '2000', time: '00年代', av: '5', version: '其他' },
    { r: '1990', time: '90年代' },
    { r: '1980', time: '80年代' },
    { r: '1970', time: '70年代' },
    { r: '-1969', time: '更早' },
  ];
  return conditions.reduce((sequence, condition) => sequence.then(async (results) => {
    const data = await getAllBangumi({
      api: page => `https://list.youku.com/category/show/c_100_a_%E6%97%A5%E6%9C%AC_s_6_d_1_p_${page}_r_${condition.r}_av_${condition.av || ''}.html`,
      message: (page, total) => `Crawling page ${page}/${total || '?'} with conditions: ${[condition.time, condition.version || '全部']}`,
      total: $ => $('.yk-pages li')
        .filter((i, el) => /^\d+$/.test($(el).text()))
        .last()
        .text() * 1 || 1,
      items: $ => $('.box-series>ul>li')
        .filter((i, el) => $(el).find('.p-time span').text() !== '资料')
        .map((i, el) => {
          const title = $(el).find('.info-list .title a').text();
          const href = $(el).find('.info-list .title a').attr('href');
          const img = $(el).find('.quic').attr('src');
          const info = $(el).find('.p-time span').text();
          return { title, img, href, info, time: condition.time, type: condition.version };
        })
        .get(),
    });
    return results.concat(data);
  }), Promise.resolve([]));
};

async function getUtid() {
  const api = 'https://log.mmstat.com/eg.js';
  const text = await fetch(api).then(res => res.text());
  return text.match(/goldlog\.Etag="(.+?)";/)[1];
}

/**
 * 获取是否正版
 * @param  {String} encodevid 第一集 ID
 * @return {Object}           是否正版
 */
async function getOfficial(encodevid) {
  // https://github.com/soimort/you-get/blob/develop/src/you_get/extractors/youku.py
  const query = {
    vid: encodevid,
    ccode: '0508',
    client_ip: '192.168.1.1',
    utid: await getUtid(),
    client_ts: Date.now() / 1e3 | 0,
    ckey: 'DIl58SLFxFNndSV1GFNnMQVYkx1PP5tKe1siZu/86PR1u/Wh1Ptd+WOZsHHWxysSfAOhNJpdVWsdVJNsfJ8Sxd8WKVvNfAS8aS8fAOzYARzPyPc3JvtnPHjTdKfESTdnuTW6ZPvk2pNDh4uFzotgdMEFkzQ5wZVXl2Pf1/Y6hLK0OnCNxBj3+nb0v72gZ6b0td+WOZsHHWxysSo/0y9D2K42SaB8Y/+aD2K42SaB8Y/+ahU+WOZsHcrxysooUeND',
  };
  // 这个 API 中 data.show.pay 不准确，不能作为 premuiumOnly
  const api = `https://ups.youku.com/ups/get.json?${querystring.stringify(query)}`;
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.101 Safari/537.36',
    Referer: 'http://v.youku.com',
  };
  const { data } = await fetch(api, { headers }).then(res => res.json());
  if (data.error) {
    throw new Error(data.error.note);
  }
  return {
    official: !!(data.show && data.show.copyright * 1 === 1),
  };
}

/**
 * 获取第一集 ID 和放送时间
 * @param  {String} proId 番剧 ID
 * @return {String}       第一集 ID 和放送时间
 */
async function getVid(proId) {
  const CLIENT_ID = 'f8c97cdf52e7a346';
  const api = `https://openapi.youku.com/v2/shows/videos.json?client_id=${CLIENT_ID}&show_id=${proId}&count=1`;
  const { videos } = await fetch(api).then(res => res.json());
  return videos.length
    ? {
      vid: videos[0].id,
      begin: new Date(`${videos[0].published}+08:00`).toISOString(),
      exist: true,
    }
    : { exist: false };
}

/**
 * 获取是否收费
 * @param  {String} acode 番剧 ID
 * @return {Boolean}      premuiumOnly
 */
async function getPremuiumOnly(id) {
  const url = `https://list.youku.com/show/id_z${id}.html`;
  const $ = await fetch(url)
    .then(res => res.text())
    .then(cheerio.load);
  return { premuiumOnly: !!$('.vip-free').length };
}

exports.getInfo = async function getInfo(rawId) {
  try {
    const id = rawId.slice(-20);
    const { vid, begin = '', exist } = await getVid(id);
    const { official = null } = await getOfficial(vid);
    const { premuiumOnly = null } = await getPremuiumOnly(id);
    return {
      begin,
      official,
      premuiumOnly,
      exist,
    };
  } catch (err) {
    console.log(err);
    return {};
  }
};
