const cheerio = require('cheerio');
const fetch = require('node-fetch');

function getBegin(id) {
  const url = `https://www.netflix.com/title/${id}`;
  return fetch(url)
    .then(res => res.text())
    .then(cheerio.load)
    .then($ => $('script[type="application/ld+json"]').text() || '{}')
    .then(JSON.parse)
    .then(({ startDate }) => ({
      begin: startDate
        ? `${startDate.replace(/\b(\d)\b/g, '0$1')}T00:00:00.000Z`
        : '',
    }));
}

module.exports = async (id) => {
  let info = {};
  try {
    const { begin } = await getBegin(id);
    info = {
      begin,
      official: true,
      premuiumOnly: true,
      exist: null,
    };
  } catch (e) {
    console.log(e);
  }
  return Object.assign({ site: 'netflix', id }, info);
};
