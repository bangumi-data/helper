const fs = require('fs-extra');
const path = require('path');
const cheerio = require('cheerio');
const ora = require('ora');

const { fetch } = require('../utils.js');

async function getIdMap() {
  const spinner = ora('Fetching IQiYi ID Map').start();
  const api = 'https://raw.githubusercontent.com/bangumi-data/helper/master/lib/crawlers/dicts/iqiyi.json';
  const remote = await fetch(api).then((res) => (res.ok ? res.json() : {})).catch(() => ({}));
  const idMapFile = path.resolve(__dirname, './dicts/iqiyi.json');
  const local = await fs.readJSON(idMapFile).catch(() => ({}));
  spinner.stop();
  return { ...local.ID_MAP, ...remote.ID_MAP };
}

let ID_MAP = null;

async function correctId({ albumId, playUrl }) {
  if (!ID_MAP) {
    ID_MAP = await getIdMap();
  }
  if (ID_MAP[albumId]) {
    return ID_MAP[albumId];
  }
  const html = await fetch(playUrl).then((res) => res.text());
  return html.match(/"albumUrl":\s*"\/\/www\.iqiyi\.com\/(\w+?)\.html"/)[1];
}

async function getAllBangumi(condition, page = 1, total = 0) {
  const spinner = ora(`Crawling page ${page}/${total || '?'} of ${condition.name}`).start();
  const perPage = 48;
  const api = `http://pcw-api.iqiyi.com/search/video/videolists?channel_id=4&data_type=1&mode=4&pageNum=${page}&pageSize=${perPage}&site=iqiyi&three_category_id=38;must,${condition.id};must&without_qipu=1`;
  const { code, data } = await fetch(api).then((res) => res.json());
  spinner.stop();
  if (code !== 'A00000') {
    throw new Error(code);
  }
  const items = data.list
    .filter((item) => item.albumId)
    .map((item) => ({
      albumId: item.albumId,
      title: item.name,
      playUrl: item.playUrl,
      img: item.imageUrl,
    }));
  if (page < data.pageTotal) {
    return items.concat(await getAllBangumi(condition, page + 1, data.pageTotal));
  }
  return items;
}

exports.getAll = async function getAll() {
  // 爱奇艺一个搜索条件最多显示 900 条，故分多个搜索条件获得所有结果
  const conditions = [
    { id: 30220, name: '动画' },
    { id: 32782, name: '特别篇' },
    { id: 32784, name: '动画电影' },
  ];
  const items = await conditions.reduce((sequence, condition) => sequence.then(async (results) => {
    const data = await getAllBangumi(condition);
    return results.concat(data);
  }), Promise.resolve([]));
  await items.reduce((sequence, item, idx) => sequence.then(async () => {
    const spinner = ora(`[${idx}/${items.length}]Correcting ID of ${item.title}`).start();
    try {
      const id = await correctId(item);
      Object.assign(item, { id });
    } catch (err) {
      console.log(err);
    }
    spinner.stop();
  }), Promise.resolve());
  return items;
};

async function getAlbumId(id) {
  const api = `https://www.iqiyi.com/${id}.html`;
  const $ = await fetch(api)
    .then((res) => res.text())
    .then(cheerio.load);
  return $('.album_downLine_bd p a').data('videodownline-albumid');
}

exports.getBegin = async function getBegin(id) {
  const albumId = await getAlbumId(id);
  const api = `http://cache.video.qiyi.com/jp/avlist/${albumId}/1/50/`;
  const { code, message, data } = await fetch(api)
    .then((res) => res.text())
    .then((text) => JSON.parse(text.match(/var\stvInfoJs=(.*)/)[1]));
  if (code !== 'A00000') {
    throw new Error(message);
  }
  const video = data.vlist
    .filter((v) => v.type * 1 === 1)
    .shift();
  return video ? new Date(video.publishTime) : '';
};
