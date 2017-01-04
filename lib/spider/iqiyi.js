const cheerio = require('cheerio');
const fetch = require('node-fetch');

/**
 * 获取专辑 ID
 * @param  {String} id 番剧 ID
 * @return {String}    专辑 ID
 */
function getAlbumId(id) {
  const api = `http://www.iqiyi.com/${id}.html`;
  return fetch(api)
    .then(res => res.text())
    .then(cheerio.load)
    .then($ => $('.album_downLine_bd p a').data('videodownline-albumid'));
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
  .then(json => {
    if (json.code !== 'A00000') {
      return Promise.reject(new Error(json.message));
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
 * @return {String}      放送时间，ISO 8601 格式
 */
function getBeginTime(tvId) {
  if (tvId === null) {
    return '';
  }
  const api = `http://mixer.video.iqiyi.com/jp/mixin/videos/${tvId}`;
  return fetch(api)
    .then(res => res.text())
    .then(text => JSON.parse(text.match(/var\stvInfoJs=(.*)/)[1]))
    .then(json => new Date(json.issueTime).toISOString());
}

module.exports = function(id) {
  return getAlbumId(id)
    .then(getTvId)
    .then(getBeginTime)
    .then(beginTime => ({
      site: 'iqiyi',
      id,
      begin: beginTime || ''
    }))
    .catch(console.log);
};
