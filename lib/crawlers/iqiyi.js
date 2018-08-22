const cheerio = require('cheerio');
const fetch = require('node-fetch');

const { getAllBangumi } = require('../utils.js');

exports.getAll = async function getAll() {
  // 爱奇艺一个搜索条件最多显示 30 页，故分多个搜索条件获得所有结果
  const conditions = [
    { id: 65, version: 'TV版' },
    { id: 66, version: 'OVA版' },
    { id: 67, version: '剧场版' },
    // { id: 68, version: '真人版' },
    { id: 69, version: '特别版' },
    { id: 303, version: '电影版' },
    { id: 30272, version: '短片' },
  ];
  return conditions.reduce((sequence, condition) => sequence.then(async (results) => {
    const data = await getAllBangumi({
      api: page => `https://list.iqiyi.com/www/4/38--${condition.id}-----------4-${page}-1-iqiyi--.html`,
      message: (page, total) => `Crawling page ${page}/${total || '?'} of ${condition.version}`,
      total: $ => $('.mod-page')
        .children()
        .filter((i, el) => /^\d+$/.test($(el).text()))
        .last()
        .text() * 1 || 1,
      items: $ => $('.site-piclist li')
        .map((i, el) => {
          const title = $(el).find('.site-piclist_info_title a').text();
          const href = $(el).find('.site-piclist_info_title a').attr('href');
          const [, id] = href.match(/\.com\/(\w+)\.html/);
          const img = $(el).find('.site-piclist_pic a img').attr('src');
          return { id, title, img };
        })
        .get(),
    });
    return results.concat(data.filter(({ id }) => id.startsWith('a_')));
  }), Promise.resolve([]));
};

/**
 * 获取专辑 ID
 * @param  {String} id 番剧 ID
 * @return {Object}    专辑 ID 和是否会员
 */
async function getAlbumId(id) {
  const api = `https://www.iqiyi.com/${id}.html`;
  const $ = await fetch(api)
    .then(res => res.text())
    .then(cheerio.load);
  return {
    albumId: $('.album_downLine_bd p a').data('videodownline-albumid'),
    premuiumOnly: !!$('.result_pic .icon-viedo-vip-new').length,
  };
}

/**
 * 获取第一集动画 ID，这个 API 中的 publishTime 是视频上传时间
 * @param  {String} albumId 专辑 ID
 * @return {String}         第一集 tvId
 */
async function getTvId(albumId) {
  const api = `http://cache.video.qiyi.com/jp/avlist/${albumId}/1/50/`;
  const { code, message, data } = await fetch(api)
    .then(res => res.text())
    .then(text => JSON.parse(text.match(/var\stvInfoJs=(.*)/)[1]));
  if (code !== 'A00000') {
    throw new Error(message);
  }
  const firstEp = data.vlist
    .filter(v => v.type * 1 === 1)
    .shift();
  return firstEp ? firstEp.id : null;
}

/**
 * 获取放送时间
 * @param  {String} tvId
 * @return {Object}      放送时间（ISO 8601 格式）
 */
async function getBeginAndExist(tvId) {
  if (tvId === null) {
    return { exist: false };
  }
  const api = `http://mixer.video.iqiyi.com/jp/mixin/videos/${tvId}`;
  const json = await fetch(api)
    .then(res => res.text())
    .then(text => JSON.parse(text.match(/var\stvInfoJs=(.*)/)[1]));
  return {
    begin: new Date(json.issueTime).toISOString(),
    exist: true,
  };
}

exports.getInfo = async function getInfo(id) {
  try {
    const { albumId, premuiumOnly } = await getAlbumId(id);
    const tvId = await getTvId(albumId);
    const { begin, exist } = await getBeginAndExist(tvId);
    return {
      begin: begin || '',
      official: true,
      premuiumOnly,
      exist,
    };
  } catch (err) {
    console.log(err);
    return {};
  }
};
