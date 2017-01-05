// http://apis.web.pptv.com/show/videoList?pid=9041257
// data.fixupdate
// vip
const fetch = require('node-fetch');

/**
 * 获取番剧 ID 和是否会员
 * @param  {String} id 编码的番剧 ID
 * @return {Object}    meta 信息
 */
function getMeta(id) {
  const url = `http://v.pptv.com/page/${id}.html`;
  return fetch(url)
    .then(res => res.text())
    .then((text) => {
      const webcfg = text.match(/var\s+webcfg\s+=\s+(.*?);\s+<\/script>/);
      if (!webcfg) {
        return Promise.reject(new Error('404 Not Found'));
      }
      return JSON.parse(webcfg[1]);
    });
}

/**
 * 某些番组要 Cookie 里有 ppi 才会返回数据，还有一些要求有 pgv_pvi
 * @return {String} PPI
 */
function getPPI() {
  const api = 'http://tools.aplusapi.pptv.com/get_ppi';
  return fetch(api)
    .then(res => res.text())
    .then(text => text.match(/\(\{"ppi":"(.*)"\}\)/)[1].slice(0, 8));
}

/**
 * 获取放送时间
 * @param  {Number} pid 番剧 ID
 * @return {String}     放送时间为文本，需之后手动处理
 */
function getBeginTime(pid) {
  const api = `http://apis.web.pptv.com/show/videoList?pid=${pid}`;
  return getPPI().then(ppi =>
    fetch(api, { headers: { Cookie: `pgv_pvi=3266022400;ppi=${ppi}` } })
      .then(res => res.json())
      .then((json) => {
        if (json.err) {
          return Promise.reject(new Error(json.msg));
        }
        return json.data.fixupdate;
      })
  );
}

module.exports = id =>
  getMeta(id)
    .then(meta =>
      getBeginTime(meta.id)
        .then(begin => ({
          begin,
          premuiumOnly: Number(meta.isVip) !== 0,
        }))
    )
    .then(info => Object.assign({ site: 'pptv', id }, info))
    .catch(console.log);
