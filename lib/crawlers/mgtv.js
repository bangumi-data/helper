const { fetch, getAllBangumi } = require('../utils.js');

exports.getAll = async function getAll() {
  return getAllBangumi({
    api: (page) => `https://list.mgtv.com/50/a4-1277384--a6-----a7-2-${page}---.html`,
    total: ($) => $('.w-pages ul li a')
      .map((i, el) => $(el).text())
      .get()
      .filter((x) => /^\d+$/.test(x))
      .length,
    items: ($) => $('.m-result-list-item')
      .map((i, el) => {
        const title = $(el).find('.u-title').text();
        const href = $(el).find('.u-title').attr('href');
        const [, id] = href.match(/\/b\/(\d+)\//);
        const img = $(el).find('.u-pic').attr('src');
        return { id, title, img, href: `https://www.mgtv.com/h/${id}.html` };
      })
      .get(),
  });
};

exports.getBegin = async function getBegin(id) {
  const api = `https://pcweb.api.mgtv.com/episode/list?video_id=${id}&page=0&size=25`;
  const { data } = await fetch(api).then((res) => res.json());
  const time = data.list
    .map((l) => new Date(`${l.ts}Z`))
    .sort((a, b) => a - b)
    .shift();
  return time ? time.toISOString() : '';
};
