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
  const api = `http://d.api.m.le.com/detail/episode?pid=${id}&platform=pc&page=1&pagesize=50`;
  return fetch(api)
    .then(res => res.json())
    .then(({ data }) => {
      const premuiumOnly = data.list.some(({ ispay }) => ispay);
      return { official: premuiumOnly, premuiumOnly };
    });
}

module.exports = id =>
  getInfo(id)
    .catch(console.log)
    .then(info => Object.assign({}, DEFAULT_INFO, { id }, info));
