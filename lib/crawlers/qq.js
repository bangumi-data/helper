const { fetch, getAllBangumi } = require('../utils.js');

exports.getAll = async function getAll() {
  return getAllBangumi({
    api: (page) => `https://v.qq.com/x/bu/pagesheet/list?channel=cartoon&iarea=2&language=1&listpage=2&sort=19&pagesize=30&offset=${(page - 1) * 30}`,
    total: ($) => $('.mod_pages .page_num').last().text() * 1,
    items: ($) => $('.list_item')
      .map((i, el) => {
        const title = $(el).find('a.figure').attr('title');
        const href = $(el).find('a.figure').attr('href');
        const [, id] = href.match(/\/cover\/(\w+)\.html/);
        return { id: `${id[0]}/${id}`, title, href: `https://v.qq.com/detail/x/${id}.html` };
      })
      .get()
      // fuck you tencent video
      .filter(({ id }) => !id.startsWith('s/sdp001')),
  });
};

exports.getBegin = async function getBegin(id) {
  const api = `https://ncgi.video.qq.com/fcgi-bin/liveportal/follow_info?otype=json&t=1&id=${id}`;
  const json = await fetch(api)
    .then((res) => res.text())
    .then((text) => JSON.parse(text.match(/QZOutputJson=(.*);$/)[1]));
  return json.follow[0].followdesc;
};
