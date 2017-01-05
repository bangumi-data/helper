const fetch = require('node-fetch');

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
 * 获取放送时间
 * @param  {Number} playlistId Playlist ID
 * @return {String}            放送时间为文本，需之后手动处理
 */
function getBeginTime(playlistId) {
  const api = `http://pl.hd.sohu.com/videolist?playlistid=${playlistId}`;
  return fetch(api)
    .then(res => res.json())
    .then(json => json.updateNotification);
}

module.exports = id =>
  getPlaylistId(id)
    .then(getBeginTime)
    .then(begin => ({ site: 'sohu', id, begin }))
    .catch(console.log);
