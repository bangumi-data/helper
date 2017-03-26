const fetch = require('node-fetch');

const DEFAULT_INFO = {
  site: 'letv',
  id: '',
  begin: '',
  official: true,
  premuiumOnly: false,
  censored: false,
  lang: 'zh-Hans',
  comment: '',
};

/**
 * 获取番剧信息
 * @param  {String} id 番剧 ID
 * @return {Object}    是否官方、是否付费
 */
function getInfo(id) {
  const api = `http://api.le.com/mms/out/album/videos?cid=5&platform=pc&id=${id}`;
  return fetch(api)
    .then(res => res.json())
    .then((json) => {
      const premuiumOnly = json.data.some(({ payPlatforms }) => payPlatforms.length);
      return { official: premuiumOnly, premuiumOnly };
    });
}

module.exports = id =>
  getInfo(id)
    .then(info => Object.assign(DEFAULT_INFO, { id }, info))
    .catch(console.log);
