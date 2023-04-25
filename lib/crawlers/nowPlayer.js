const cheerio = require('cheerio');
const { getAllBangumi, matchBangumi } = require('../utils.js');

async function getAllByLang(lang) {
  return getAllBangumi({
    api: () => `https://nowplayer.now.com/ondemand/seeall?filterType=all&nodeId=C202010070000010&lang=${lang}`,
    total: () => { },
    items: ($) => $('.product-item')
      .map((i, el) => {
        const aEl = $(el).find('a');
        return {
          id: aEl.attr('href').match(/id=(\w+)&type=series/)[1],
          title: aEl.attr('alt'),
        }
      })
      .get(),
  });
}

exports.getAll = async function getAll() {
  const [itemsEn, itemsZh] = await Promise.all([
    getAllByLang('en'),
    getAllByLang('zh'),
  ]);
  return itemsEn.map((item) => {
    return {
      id: item.id,
      titleTranslate: {
        'zh-Hant': [itemsZh.find(i => item.id == i.id).title],
        'en': [item.title]
      }
    }
  });
};

exports.getBegin = async function getBegin(id) {
  return '';
};

exports.matchBangumi = async (input, items) => {
  return matchBangumi(input, { items });
}
