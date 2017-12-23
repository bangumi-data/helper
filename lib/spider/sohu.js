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
        throw new Error('404 Not Found');
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
      exist: json.totalSet > 0,
    }));
}

module.exports = async (id) => {
  let info = {};
  try {
    const playlistId = await getPlaylistId(id);
    const { begin, premuiumOnly, exist } = await getInfo(playlistId);
    info = {
      begin,
      official: true,
      premuiumOnly,
      exist,
    };
  } catch (e) {
    console.log(e);
  }
  return Object.assign({ site: 'sohu', id }, info);
};
