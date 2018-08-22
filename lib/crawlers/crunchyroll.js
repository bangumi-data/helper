const { getAllBangumi } = require('../utils.js');

exports._getAll = async function getAll() {
  const conditions = (() => {
    const results = [];
    const seasons = ['fall', 'summer', 'spring', 'winter'];
    for (let year = new Date().getUTCFullYear(); year >= 2009; year--) {
      results.push(...seasons.map(season => ({ year, season })));
    }
    return results;
  })();
  const items = await conditions.reduce((sequence, condition) => sequence.then(async (results) => {
    const data = await getAllBangumi({
      api: page => `http://www.crunchyroll.com/videos/anime/seasons/ajax_page?pg=${page}&tagged%5B%5D=season%3A${condition.season}_${condition.year}`,
      message: (page, total) => `Crawling page ${page}/${total || '?'} of ${condition.year} ${condition.season}`,
      total: ($, page) => ($('li').length ? page + 1 : page),
      items: $ => $('li')
        .map((i, el) => {
          const groupId = $(el).attr('group_id');
          const title = $(el).find('.portrait-element').attr('title');
          const href = $(el).find('.portrait-element').attr('href');
          const id = href.slice(1);
          const img = $(el).find('.img-holder img').attr('src');
          return { groupId, id, title, img };
        })
        .get(),
    }, 0);
    return results.concat(data);
  }), Promise.resolve([]));
  return [...new Set(items.map(({ groupId }) => groupId))]
    .map(groupId => items.find(item => item.groupId === groupId));
};
