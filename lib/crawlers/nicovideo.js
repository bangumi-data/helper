const fs = require('fs-extra');
const path = require('path');
const cheerio = require('cheerio');
const ora = require('ora');

const { fetch, matchBangumi } = require('../utils.js');

async function getIdMap() {
  const spinner = ora('Fetching Nicovideo ID Map').start();
  const api = 'https://cdn.jsdelivr.net/gh/bangumi-data/helper@master/lib/crawlers/dicts/nicovideo.json';
  const remote = await fetch(api).then((res) => (res.ok ? res.json() : {})).catch(() => ({}));
  const idMapFile = path.resolve(__dirname, './dicts/nicovideo.json');
  const local = await fs.readJSON(idMapFile).catch(() => ({}));
  spinner.stop();
  return { ...local.ID_MAP, ...remote.ID_MAP };
}

async function saveIdMap(ID_MAP) {
  const outputFile = path.resolve(__dirname, './dicts/nicovideo.json');
  await fs.outputJson(outputFile, { ID_MAP }, { spaces: 2 });
}

async function correctId(nid) {
  let id = null;
  const $ = await fetch(`https://anime.nicovideo.jp/detail/${nid}/index.html`)
    .then((res) => res.text())
    .then(cheerio.load);
  const aEl = $("a[onclick*='-chvideo']");
  if (aEl.length > 0) {
    const href = aEl.attr('href');
    if (/ch.nicovideo.jp\/(.*?)\?/.test(href)) {
      id = href.match(/ch.nicovideo.jp\/(.*?)\?/)[1];
    }
  }
  return id;
}

exports.getAll = async function getAll() {
  // アニメ50音検索
  const pageList = ['a', 'i', 'u', 'e', 'o', 'ka', 'ki', 'ku', 'ke', 'ko', 'sa', 'shi', 'su', 'se', 'so', 'ta', 'chi', 'tsu', 'te', 'to', 'na', 'ni', 'nu', 'ne', 'no', 'ha', 'hi', 'fu', 'he', 'ho', 'ma', 'mi', 'mu', 'me', 'mo', 'ya', 'yu', 'yo', 'ra', 'ri', 'ru', 're', 'ro', 'wa', 'wo', 'n'];
  let ID_MAP = await getIdMap();
  let items = [];

  await pageList.reduce((sequence, page, idx) => sequence.then(async () => {
    const spinnerText = `Crawling page ${page}`;
    const spinner = ora(spinnerText).start();
    const api = `https://anime.nicovideo.jp/search/anime/${page}.html`;
    const $ = await fetch(api)
      .then((res) => res.text())
      .then(cheerio.load);

    const elList = $('main>section>ul>li');
    for (let el of elList) {
      const title = $(el).find('a').text();
      let href = $(el).find('a').attr('href');
      if (/ch.nicovideo.jp\/(.*?)\?/.test(href)) {
        // 舊版介面
        const id = href.match(/ch.nicovideo.jp\/(.*?)\?/)[1];
        items.push({ id, title });
      } else if (/detail\/(.*?)\/index.html/.test(href)) {
        // 新版介面
        spinner.text = `${spinnerText} - Correcting ID of ${title}`;
        const nid = href.match(/detail\/(.*?)\/index.html/)[1];
        let id = null;
        try {
          if (ID_MAP[nid]) {
            id = ID_MAP[nid];
          } else {
            id = await Promise.resolve(correctId(nid));
            ID_MAP[nid] = id;
          }
        } catch (err) {
          console.log(err);
        }
        if (id !== null) {
          items.push({ id, title });
        }
        spinner.text = spinnerText;
      }
    }

    spinner.stop();
  }), Promise.resolve());

  // save ID_MAP
  await saveIdMap(ID_MAP);

  return items;
};

/**
 * 获取视频列表
 * @param  {String} id 频道 ID
 * @return {Array}     视频列表
 */
async function getList(id) {
  // 投稿が古い順
  const api = `https://ch.nicovideo.jp/${id}/video?sort=f&order=a`;
  const $ = await fetch(api)
    .then((res) => res.text())
    .then(cheerio.load);
  return $('.item .title a')
    .map((i, el) => $(el).attr('href').match(/watch\/(\w+)/)[1])
    .get();
}

async function _getBegin(vid) {
  const api = `https://ext.nicovideo.jp/api/getthumbinfo/${vid}`;
  const $ = await fetch(api)
    .then((res) => res.text())
    .then(cheerio.load);
  // 正片都会在描述中列出上一集或下一集
  // 新的番組描述中好像沒有列出上一集或下一集了
  // return /watch\/\d+/.test($('description').text())
  //   ? new Date($('first_retrieve').text()).toISOString()
  //   : '';
  return new Date($('first_retrieve').text()).toISOString();
}

exports.getBegin = async function getBegin(id) {
  const vids = await getList(id);
  const begin = await vids.reduce((seq, vid) => seq.then((bgn) => (
    // 去除排在前面的 PV、CM 等
    bgn || _getBegin(vid)
  )), Promise.resolve(''));
  return begin;
};

exports.matchBangumi = async (input, items) => {
  return matchBangumi(input, { items });
}
