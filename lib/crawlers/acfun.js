const ora = require('ora');
const cheerio = require('cheerio');

const { fetch, matchBangumi } = require('../utils.js');

exports.getAll = async function getAll(page = 1, total = 0) {
  const spinner = ora(`Crawling page ${page}/${total || '?'}`).start();
  const api = `https://www.acfun.cn/bangumilist?quickViewId=bangumiList&ajaxpipe=1&filters=11,20,31,40,50,805306368&pageNum=${page}`;
  const { html } = await fetch(api)
    .then((res) => res.text())
    .then((text) => text.replace(/\/\*.+?\*\/$/, ''))
    .then(JSON.parse);
  spinner.stop();
  const $ = cheerio.load(html);
  const totalCount = $('.ac-mod-list').data('totalcount') * 1;
  const pageSize = $('.ac-mod-list').data('pagesize') * 1;
  const items = $('.ac-mod-li').map((index, el) => ({
    id: String($(el).data('aid')),
    title: $(el).find('.ac-mod-title').attr('title'),
  })).get();
  if (page * pageSize < totalCount) {
    return items.concat(await getAll(page + 1, Math.ceil(totalCount / pageSize)));
  }
  return items;
};

exports.getBegin = async function getBegin(id) {
  const api = `https://www.acfun.cn/bangumi/aa${id}`;
  const html = await fetch(api).then((res) => res.text());

  const dataMatch = html.match(/window\.bangumiList\s?=\s?(\{.+\});/);
  if (!dataMatch) {
    return '';
  }

  let data = null;
  try {
    data = JSON.parse(dataMatch[1]);
  } catch (e) {
    console.error(e);
    return '';
  }

  if (!data.totalCount) return '';
  const video = data.items
    .sort((a, b) => a.updateTime - b.updateTime)
    .shift();
  return video ? new Date(video.updateTime).toISOString() : '';
};

exports.matchBangumi = async (input, items) => {
  return matchBangumi(input, { items });
}

exports.getIsBangumiOffline = async (id) => {
  const url = `https://www.acfun.cn/bangumi/aa${id}`;
  return await fetch(url)
    .then((res) => res.status === 404);
}
