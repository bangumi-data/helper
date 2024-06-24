const ora = require('ora');
const cheerio = require('cheerio');

const { fetch, matchBangumi } = require('../utils.js');

exports.getAll = async function getAll(page = 1) {
  const spinner = ora(`Crawling page ${page}/?`).start();
  const api = `https://list.le.com/getLesoData?from=pc&src=1&stype=1&ps=30&pn=${page}&ph=420001&dt=1&cg=5&or=5&stt=1&ar=50041&s=1`;
  const json = await fetch(api).then((res) => res.json());
  spinner.stop();
  const items = json.data.arr
    .map(({ aid, name, imgUrl }) => ({ id: aid, title: name, img: imgUrl }));
  if (json.data.more) {
    return items.concat(await getAll(page + 1));
  }
  return items;
};

exports.getBegin = async function getBegin() {
  return '';
};

exports.matchBangumi = async (input, items) => {
  return matchBangumi(input, { items });
}

exports.getIsBangumiOffline = async (id) => {
  const api = `https://www.le.com/comic/${id}.html/`;
  const $ = await fetch(api)
    .then((res) => res.text())
    .then(cheerio.load);
  return $('.error-txt').length > 0;
}
