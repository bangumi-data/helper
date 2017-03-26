const cheerio = require('cheerio');
const fetch = require('node-fetch');

const DEFAULT_INFO = {
  site: 'nicovideo',
  id: '',
  begin: '',
  official: true,
  premuiumOnly: true,
  censored: false,
  lang: 'ja',
  comment: '',
};

/**
 * 获取视频列表
 * @param  {String} id 频道 ID
 * @return [Array]     视频列表
 */
function getList(id) {
  // 投稿が古い順
  const api = `http://ch.nicovideo.jp/${id}/video?sort=f&order=a`;
  return fetch(api)
    .then(res => res.text())
    .then(cheerio.load)
    .then($ =>
      $('.item .title a')
        .map((i, el) => $(el).attr('href').match(/watch\/(\d+)/)[1])
        .get()
    );
}

/**
 * 获取放送时间
 * @param  {String} vid 视频 ID
 * @return {String}     放送时间
 */
function getBegin(vid) {
  const api = `https://ext.nicovideo.jp/api/getthumbinfo/${vid}`;
  return fetch(api)
    .then(res => res.text())
    .then(cheerio.load)
    .then($ => (
      // 正片都会在描述中列出上一集或下一集
      /watch\/\d+/.test($('description').text())
        ? new Date($('first_retrieve').text()).toISOString()
        : ''
    ));
}

module.exports = id =>
  getList(id)
    .then(vids =>
      vids.reduce((seq, vid) => seq.then(begin =>
        // 去除排在前面的 PV、CM 等
        begin || getBegin(vid)
      ), Promise.resolve())
    )
    .then(begin => Object.assign(DEFAULT_INFO, { id, begin }))
    .catch(console.log);
