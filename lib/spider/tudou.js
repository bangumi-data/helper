const fetch = require('node-fetch');
const { getBeginTime } = require('./youtu.js');

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

module.exports = function(id) {
  return getVid(id)
    .then(getBeginTime)
    .then(begin =>
      getPremuiumOnly(id)
        .then(premuiumOnly => ({ begin, premuiumOnly }))
    )
    .then(info => Object.assign({ site: 'tudou', id }, info))
    .catch(console.log);
};