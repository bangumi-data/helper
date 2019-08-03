const fs = require('fs-extra');
const path = require('path');
const cheerio = require('cheerio');
const ora = require('ora');

const { fetch, getAllBangumi } = require('../utils.js');

let ID_MAP = null;

async function getIdMap() {
  const spinner = ora('Fetching Nicovideo ID Map').start();
  const api = 'https://raw.githubusercontent.com/bangumi-data/helper/master/lib/crawlers/dicts/nicovideo.json';
  const remote = await fetch(api).then(res => (res.ok ? res.json() : {}));
  const idMapFile = path.resolve(__dirname, './dicts/nicovideo.json');
  const local = await fs.readJSON(idMapFile).catch(() => ({}));
  spinner.stop();
  return Object.assign({}, local.ID_MAP, remote.ID_MAP);
}

async function correctId(nid) {
  if (!ID_MAP) {
    ID_MAP = await getIdMap();
  }
  if (ID_MAP[nid]) {
    return ID_MAP[nid];
  }
  const api = `https://ch.nicovideo.jp/${nid}/video?rss=2.0`;
  const html = await fetch(api).then(res => res.text());
  const [, id] = html.match(/nicovideo\.jp\/(.+?)\/video\?rss=2\.0/) || [];
  return id || nid;
}

exports.getAll = async function getAll() {
  const items = await getAllBangumi({
    api: page => `https://ch.nicovideo.jp/portal/anime/list?&page=${page}`,
    total: $ => 10 || $('.pages select option').length,
    items: $ => $('.channels>ul>li')
      .map((i, el) => {
        const title = $(el).find('.channel_name').attr('title');
        const href = $(el).find('.channel_name').attr('href');
        const nid = href.slice(1);
        const img = `https://secure-dcdn.cdn.nimg.jp/comch/channel-icon/128x128/${nid}.jpg`;
        return { nid, title, img };
      })
      .get(),
  });
  await items.reduce((sequence, item, idx) => sequence.then(async () => {
    const spinner = ora(`[${idx}/${items.length}]Correcting ID of ${item.title}`).start();
    try {
      const id = await correctId(item.nid);
      Object.assign(item, { id });
    } catch (err) {
      console.log(err);
    }
    spinner.stop();
  }), Promise.resolve());
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
    .then(res => res.text())
    .then(cheerio.load);
  return $('.item .title a')
    .map((i, el) => $(el).attr('href').match(/watch\/(\d+)/)[1])
    .get();
}

async function _getBegin(vid) {
  const api = `https://ext.nicovideo.jp/api/getthumbinfo/${vid}`;
  const $ = await fetch(api)
    .then(res => res.text())
    .then(cheerio.load);
  // 正片都会在描述中列出上一集或下一集
  return /watch\/\d+/.test($('description').text())
    ? new Date($('first_retrieve').text()).toISOString()
    : '';
}

exports.getBegin = async function getBegin(id) {
  const vids = await getList(id);
  const begin = await vids.reduce((seq, vid) => seq.then(bgn => (
    // 去除排在前面的 PV、CM 等
    bgn || _getBegin(vid)
  )), Promise.resolve(''));
  return begin;
};
