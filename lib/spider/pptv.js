const cheerio = require('cheerio');
const fetch = require('node-fetch');

const DEFAULT_INFO = {
  site: 'pptv',
  id: '',
  begin: '',
  official: false,
  premuiumOnly: false,
  censored: false,
  lang: 'zh-Hans',
  comment: '',
};

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
      const webcfg = text.match(/var\s+webcfg\s+=\s+(.*?);\r?\n/);
      if (!webcfg) {
        throw new Error('404 Not Found');
      }
      const $ = cheerio.load(text);
      return {
        meta: JSON.parse(webcfg[1]),
        official: !!$('.module-dpage-banner').length,
      };
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
async function getBegin(pid) {
  const api = `http://apis.web.pptv.com/show/videoList?pid=${pid}`;
  const ppi = await getPPI();
  return fetch(api, { headers: { Cookie: `pgv_pvi=3266022400;ppi=${ppi}` } })
    .then(res => res.json())
    .then((json) => {
      if (json.err) {
        throw new Error(json.msg);
      }
      return json.data.fixupdate;
    });
}

module.exports = async (id) => {
  let info = {};
  try {
    const { meta, official } = await getMeta(id);
    const begin = await getBegin(meta.id);
    info = { begin, official, premuiumOnly: Number(meta.isVip) !== 0 };
  } catch (e) {
    console.log(e);
  }
  return Object.assign({}, DEFAULT_INFO, { id }, info);
};
