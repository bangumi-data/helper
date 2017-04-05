const fetch = require('node-fetch');

const DEFAULT_INFO = {
  site: 'mgtv',
  id: '',
  begin: '',
  official: false,
  premuiumOnly: false,
  censored: false,
  lang: 'zh-Hans',
  comment: '',
};

/**
 * 获取放送时间与是否会员
 * @param  {String} cid 番剧 ID
 * @return {Object}     放送时间为文本，需之后手动处理
 */
function getInfo(cid) {
  const api = `http://v.api.mgtv.com/list/tvlist?collection_id=${cid}`;
  return fetch(api)
    .then(res => res.json())
    .then((json) => {
      if (json.status !== 200) {
        return Promise.reject(new Error(json.msg));
      }
      return {
        begin: json.data.info.desc,
        premuiumOnly: Number(json.data.info.isvip) !== 0,
      };
    });
}

module.exports = id =>
  getInfo(id)
    .catch(console.log)
    .then(info => Object.assign({}, DEFAULT_INFO, { id }, info));
