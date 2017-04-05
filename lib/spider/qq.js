const fetch = require('node-fetch');

const DEFAULT_INFO = {
  site: 'qq',
  id: '',
  begin: '',
  official: true,
  premuiumOnly: false,
  censored: false,
  lang: 'zh-Hans',
  comment: '',
};

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
    .then(json => json.follow[0].followdesc);
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
    .then(json => json.video_play_list.mix_free_vip_episode !== '0');
}

module.exports = (fakeId) => {
  const id = fakeId.replace(/^\w\//, '');
  return getBegin(id)
    .then(begin =>
      getPremuiumOnly(id)
        .then(premuiumOnly => ({ premuiumOnly, begin }))
    )
    .catch(console.log)
    .then(info => Object.assign({}, DEFAULT_INFO, { id: fakeId }, info));
};
