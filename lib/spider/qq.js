const fetch = require('node-fetch');

/**
 * 获取放送时间
 * @param  {Number} id 番剧 ID
 * @return {String}     放送时间为文本，需之后手动处理
 */
function getBegin(id) {
  const api = `https://ncgi.video.qq.com/fcgi-bin/liveportal/follow_info?otype=json&t=1&id=${id}`;
  return fetch(api)
    .then(res => res.text())
    .then(text => JSON.parse(text.match(/QZOutputJson=(.*);$/)[1]))
    .then(json => ({ begin: json.follow[0].followdesc }));
}

/**
 * 获取是否付费
 * @param  {String} id 番剧 ID
 * @return {Boolean}   是否付费
 */
function getPremuiumOnly(id) {
  const api = `http://s.video.qq.com/loadplaylist?type=6&id=${id}&plname=qq&otype=json`;
  return fetch(api)
    .then(res => res.text())
    .then(text => JSON.parse(text.match(/QZOutputJson=(.*);$/)[1]))
    .then(json => ({
      premuiumOnly: json.video_play_list.mix_free_vip_episode !== '0',
      exist: Number(json.video_play_list.total_episode) > 0,
    }));
}

module.exports = async (rawId) => {
  const id = rawId.replace(/^\w\//, '');
  let info = {};
  try {
    const { begin } = await getBegin(id);
    const { premuiumOnly, exist } = await getPremuiumOnly(id);
    info = {
      begin,
      premuiumOnly,
      exist,
    };
  } catch (e) {
    console.log(e);
  }
  return Object.assign({ site: 'qq', id: rawId }, info);
};
