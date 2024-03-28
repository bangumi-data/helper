const cheerio = require('cheerio');
const { fetch } = require('../utils.js');
const { Headers } = require('node-fetch');
const { matchBangumi } = require('../utils.js');

async function getAllByLang(lang = 'en') {
  const url = 'https://www.netflix.com/browse/genre/7424';
  const $ = await fetch(url, {
    headers: new Headers({
      'Accept-Language': lang
    })
  })
    .then((res) => res.text())
    .then(cheerio.load);
  const json = JSON.parse($('script[type="application/ld+json"]').html());
  // remove duplicate id
  var ids = {};
  return json.itemListElement.filter(({ item }) => {
    const id = item.url.match(/title\/(\d+)/)[1];
    return ids.hasOwnProperty(id) ? false : (ids[id] = true);
  }).map(({ item }) => {
    return {
      id: item.url.match(/title\/(\d+)/)[1],
      ...item,
    };
  });
}

exports.getAll = async function getAll() {
  const [jsonEN, jsonHK, jsonTW, jsonCN] = await Promise.all([
    getAllByLang('en'),
    getAllByLang('zh-HK'),
    getAllByLang('zh-TW'),
    getAllByLang('zh-SG'),
  ]);

  // titleList, format ['lang code', json]
  const titleList = [['en', jsonEN], ['zh-Hant', jsonHK], ['zh-Hant', jsonTW], ['zh-Hans', jsonCN]];

  // process all language and combine into 1 list
  let result = [];
  jsonEN.forEach((item) => { result.push(processItem(item, titleList)); });
  jsonHK.filter((item) => result.filter((i) => i.id === item.id).length === 0)
    .forEach((item) => { result.push(processItem(item, titleList)); });
  jsonTW.filter((item) => result.filter((i) => i.id === item.id).length === 0)
    .forEach((item) => { result.push(processItem(item, titleList)); });
  jsonCN.filter((item) => result.filter((i) => i.id === item.id).length === 0)
    .forEach((item) => { result.push(processItem(item, titleList)); });
  return result;
};

function processItem(item, titleList) {
  let titleTranslate = {};
  titleList.forEach(([lang, titles]) => {
    const title = titles.find((i) => item.id == i.id);
    if (title) {
      if (titleTranslate[lang] && !titleTranslate[lang].includes(title.name)) {
        titleTranslate[lang].push(title.name);
      } else {
        titleTranslate[lang] = [title.name];
      }
    }
  });

  return {
    id: item.id,
    titleTranslate: titleTranslate,
    href: `https://www.netflix.com/title/${item.id}`,
  }
}

exports.getBegin = async function getBegin(id) {
  const url = `https://www.netflix.com/title/${id}`;
  const $ = await fetch(url)
    .then((res) => res.text())
    .then(cheerio.load);
  const json = JSON.parse($('script[type="application/ld+json"]').html());
  return json.startDate ? new Date(json.startDate).toISOString() : json.dateCreated ? new Date(json.dateCreated).toISOString() : '';
};

exports.matchBangumi = async (input, items) => {
  return matchBangumi(input, { items });
}
