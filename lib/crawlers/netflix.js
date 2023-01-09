const cheerio = require('cheerio');
const { fetch } = require('../utils.js');
const { Headers } = require('node-fetch');

async function getAllByLang(lang = 'en', titleOnly = false) {
  const url = 'https://www.netflix.com/browse/genre/7424';
  const $ = await fetch(url, {
    headers: new Headers({
      'Accept-Language': lang
    })
  })
    .then((res) => res.text())
    .then(cheerio.load);
  const json = JSON.parse($('script[type="application/ld+json"]').html());
  if (titleOnly) {
    return json.itemListElement.map(({ item }) => ({
      id: item.url.match(/title\/(\d+)/)[1],
      title: item.name,
    }));
  } else {
    // remove duplicate id
    var ids = {};
    return json.itemListElement.filter(({ item }) => {
      const id = item.url.match(/title\/(\d+)/)[1];
      return ids.hasOwnProperty(id) ? false : (ids[id] = true);
    });
  }
}

exports.getAll = async function getAll() {
  const [json, jsonHK, jsonTW, jsonCN] = await Promise.all([
    getAllByLang('en'),
    getAllByLang('zh-HK', true),
    getAllByLang('zh-TW', true),
    getAllByLang('zh-CN', true)
  ]);

  return json.map(({ item }) => {
    const id = item.url.match(/title\/(\d+)/)[1];
    const url = `https://www.netflix.com/title/${id}`;

    // group title in different language
    const titleHK = jsonHK.find(i => id == i.id);
    const titleTW = jsonTW.find(i => id == i.id);
    const titleCN = jsonCN.find(i => id == i.id);

    let titleTranslate = {
      'en': [item.name]
    };
    if (titleCN) {
      titleTranslate['zh-Hans'] = [titleCN.title];
    }
    if (titleHK && titleTW) {
      if (titleHK.title === titleTW.title) {
        titleTranslate['zh-Hant'] = [titleTW.title];
      } else {
        titleTranslate['zh-Hant'] = [titleTW.title, titleHK.title];
      }
    } else if (titleHK) {
      titleTranslate['zh-Hant'] = [titleHK.title];
    } else if (titleTW) {
      titleTranslate['zh-Hant'] = [titleTW.title];
    }

    return {
      id: id,
      titleTranslate: titleTranslate,
      href: url,
    }
  });
};

exports.getBegin = async function getBegin(id) {
  const url = `https://www.netflix.com/title/${id}`;
  const $ = await fetch(url)
    .then((res) => res.text())
    .then(cheerio.load);
  const json = JSON.parse($('script[type="application/ld+json"]').html());
  return json.startDate ? new Date(json.startDate).toISOString() : json.dateCreated ? new Date(json.dateCreated).toISOString() : '';
};
