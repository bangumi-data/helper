const cheerio = require('cheerio');

const { fetch, getAllBangumi } = require('../utils.js');

async function getTotalPage() {
  const api = 'https://list.pptv.com/?type=3&sort=1&area=8';
  const $ = await fetch(api)
    .then((res) => res.text())
    .then(cheerio.load);
  return $('.pageNum').text().replace(/\s/g, '').split('/')[1];
}

exports.getAll = async function getAll() {
  const total = await getTotalPage();
  return getAllBangumi({
    api: (page) => `https://list.pptv.com/channel_list.html?page=${page}&type=3&area=8&sort=1`,
    total: () => total,
    items: ($) => $('li')
      .map((i, el) => {
        const title = $(el).find('.ui-list-ct').attr('title');
        const href = $(el).find('.ui-list-ct').attr('href');
        const [, id] = href.match(/show\/(\w+)\.html/);
        const img = $(el).find('.ui-pic img').data('src2');
        return { id, title, img };
      })
      .get(),
  });
};

async function getMeta(id) {
  const url = `http://v.pptv.com/page/${id}.html`;
  const text = await fetch(url).then((res) => res.text());
  const webcfg = text.match(/var\s+webcfg\s+=\s+(.*?);\r?\n/);
  if (!webcfg) {
    throw new Error('404 Not Found');
  }
  return JSON.parse(webcfg[1]);
}

/**
 * 某些番组要 Cookie 里有 ppi 才会返回数据，还有一些要求有 pgv_pvi
 * @return {String} PPI
 */
async function getPPI() {
  const api = 'http://tools.aplusapi.pptv.com/get_ppi';
  const text = await fetch(api).then((res) => res.text());
  return text.match(/\(\{"ppi":"(.*)"\}\)/)[1].slice(0, 8);
}

exports.getBegin = async function getBegin(id) {
  const meta = await getMeta(id);
  const api = `http://apis.web.pptv.com/show/videoList?pid=${meta.id}`;
  const headers = { Cookie: `pgv_pvi=3266022400;ppi=${await getPPI()}` };
  const { err, msg, data } = await fetch(api, { headers }).then((res) => res.json());
  if (err) {
    throw new Error(msg);
  }
  return data.fixupdate;
};
