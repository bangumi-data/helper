const fetch = require('node-fetch');

const DEFAULT_INFO = {
  site: 'sohu',
  id: '',
  begin: '',
  official: true,
  premuiumOnly: false,
  censored: false,
  lang: 'zh-Hans',
  comment: '',
};

/**
 * 获取 Playlist ID
 * @param  {Number} id 番剧 ID
 * @return {String}    Playlist ID
 */
function getPlaylistId(id) {
  const url = `http://tv.sohu.com/${id}`;
  return fetch(url)
    .then(res => res.text())
    .then((text) => {
      const pid = text.match(/var\s+PLAYLIST_ID="(\d+)";/);
      if (!pid) {
        return Promise.reject(new Error('404 Not Found'));
      }
      return pid[1];
    });
}

/**
 * 获取放送时间和是否付费
 * @param  {Number} playlistId Playlist ID
 * @return {Object}            放送时间为文本，需之后手动处理
 */
function getInfo(playlistId) {
  const api = `http://pl.hd.sohu.com/videolist?playlistid=${playlistId}`;
  return fetch(api)
    .then(res => res.json())
    .then(json => ({
      begin: json.updateNotification,
      premuiumOnly: json.videos.some(video => video.tvIsFee !== 0),
    }));
}

module.exports = id =>
  getPlaylistId(id)
    .then(getInfo)
    .catch(console.log)
    .then(info => Object.assign(DEFAULT_INFO, { id }, info));
