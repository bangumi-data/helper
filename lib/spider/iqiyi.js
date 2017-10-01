const cheerio = require('cheerio');
const fetch = require('node-fetch');

const DEFAULT_INFO = {
  site: 'iqiyi',
  id: '',
  begin: '',
  official: true,
  premuiumOnly: false,
  censored: false,
  lang: 'zh-Hans',
  comment: '',
};

/**
 * 获取专辑 ID
 * @param  {String} id 番剧 ID
 * @return {Object}    专辑 ID 和是否会员
 */
function getAlbumId(id) {
  const api = `http://www.iqiyi.com/${id}.html`;
  return fetch(api)
    .then(res => res.text())
    .then(cheerio.load)
    .then($ => ({
      albumId: $('.album_downLine_bd p a').data('videodownline-albumid'),
      premuiumOnly: !!$('.result_pic .icon-viedo-vip-new').length,
    }));
}

/**
 * 获取第一集动画 ID，这个 API 中的 publishTime 是视频上传时间
 * @param  {String} albumId 专辑 ID
 * @return {String}         第一集 tvId
 */
function getTvId(albumId) {
  const api = `http://cache.video.qiyi.com/jp/avlist/${albumId}/1/50/`;
  return fetch(api)
    .then(res => res.text())
    .then(text => JSON.parse(text.match(/var\stvInfoJs=(.*)/)[1]))
    .then((json) => {
      if (json.code !== 'A00000') {
        throw new Error(json.message);
      }
      const firstEp = json.data.vlist
        .filter(v => v.type * 1 === 1)
        .shift();
      return firstEp ? firstEp.id : null;
    });
}

/**
 * 获取放送时间
 * @param  {String} tvId
 * @return {Object}      放送时间（ISO 8601 格式）
 */
function getBegin(tvId) {
  if (tvId === null) {
    return Promise.resolve({});
  }
  const api = `http://mixer.video.iqiyi.com/jp/mixin/videos/${tvId}`;
  return fetch(api)
    .then(res => res.text())
    .then(text => JSON.parse(text.match(/var\stvInfoJs=(.*)/)[1]))
    .then(json => ({
      begin: new Date(json.issueTime).toISOString(),
    }));
}

module.exports = async (id) => {
  let info = {};
  try {
    const { albumId, premuiumOnly } = await getAlbumId(id);
    const tvId = await getTvId(albumId);
    const { begin } = await getBegin(tvId);
    info = { begin: begin || '', premuiumOnly };
  } catch (e) {
    console.log(e);
  }
  return Object.assign({}, DEFAULT_INFO, { id }, info);
};
