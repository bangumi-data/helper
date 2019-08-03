const cheerio = require('cheerio');
const { fetch } = require('../utils.js');

exports.getAll = async function getAll() {
  const url = 'https://www.netflix.com/browse/genre/7424';
  const $ = await fetch(url)
    .then(res => res.text())
    .then(cheerio.load);
  const json = JSON.parse($('script[type="application/ld+json"]').html());
  return json.itemListElement.map(({ item }) => ({
    id: item.url.match(/title\/(\d+)/)[1],
    title: item.name,
    url: item.url,
  }));
};

exports.getBegin = async function getBegin(id) {
  const url = `https://www.netflix.com/title/${id}`;
  const html = await fetch(url).then(res => res.text());
  const [, startTime] = html.match(/"availabilityStartTime":(\d+),/) || [];
  return startTime ? new Date(startTime * 1).toISOString() : '';
};
