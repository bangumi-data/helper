const fetch = require('node-fetch');
const { getInfo } = require('./youtu.js');

const DEFAULT_INFO = {
  site: 'tudou',
  id: '',
  begin: '',
  official: false,
  premuiumOnly: false,
  censored: false,
  lang: 'zh-Hans',
  comment: '',
};

/**
 * 获取第一集 ID
 * @param  {String} acode 番剧 ID
 * @return {String}       第一集 ID
 */
function getVid(acode) {
  const api = `http://www.tudou.com/tvp/getMultiTvcCodeByAreaCode.action?type=3&app=4&areaCode=330200&codes=${acode}`;
  return fetch(api)
    .then(res => res.json())
    .then(json => json.message[0].vcode);
}

/**
 * 获取是否收费
 * @param  {String} acode 番剧 ID
 * @return {Boolean}      premuiumOnly
 */
function getPremuiumOnly(acode) {
  const url = `http://www.tudou.com/albumcover/${acode}.html`;
  return fetch(url)
    .then(res => res.text())
    .then(text => Number(text.match(/var\s+isPay\s*=\s*(\d);/)[1]) !== 0);
}

module.exports = id =>
  getVid(id)
    .then(getInfo)
    .then(info =>
      getPremuiumOnly(id)
        .then(premuiumOnly => Object.assign(info, { premuiumOnly }))
    )
    .catch(console.log)
    .then(info => Object.assign(DEFAULT_INFO, { id }, info));
