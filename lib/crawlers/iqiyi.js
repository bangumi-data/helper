const cheerio = require('cheerio');
const ora = require('ora');

const { fetch } = require('../utils.js');

async function getAllBangumi(condition, page = 1, total = 0) {
  const spinner = ora(`Crawling page ${page}/${total || '?'} of ${condition.name}`).start();
  const perPage = 48;
  const api = `http://pcw-api.iqiyi.com/search/video/videolists?channel_id=4&data_type=1&mode=4&pageNum=${page}&pageSize=${perPage}&site=iqiyi&three_category_id=38;must,${condition.id};must&without_qipu=1`;
  const { code, data } = await fetch(api).then(res => res.json());
  spinner.stop();
  if (code !== 'A00000') {
    throw new Error(code);
  }
  const items = data.list.map(item => ({
    id: item.playUrl.match(/\.com\/(\w+)\.html/)[1],
    title: item.name,
    href: item.playUrl,
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
  return conditions.reduce((sequence, condition) => sequence.then(async (results) => {
    const data = await getAllBangumi(condition);
    return results.concat(data.filter(({ id }) => id.startsWith('a_')));
  }), Promise.resolve([]));
};

async function getAlbumId(id) {
  const api = `https://www.iqiyi.com/${id}.html`;
  const $ = await fetch(api)
    .then(res => res.text())
    .then(cheerio.load);
  return $('.album_downLine_bd p a').data('videodownline-albumid');
}

exports.getBegin = async function getBegin(id) {
  const albumId = await getAlbumId(id);
  const api = `http://cache.video.qiyi.com/jp/avlist/${albumId}/1/50/`;
  const { code, message, data } = await fetch(api)
    .then(res => res.text())
    .then(text => JSON.parse(text.match(/var\stvInfoJs=(.*)/)[1]));
  if (code !== 'A00000') {
    throw new Error(message);
  }
  const video = data.vlist
    .filter(v => v.type * 1 === 1)
    .shift();
  return video ? new Date(video.publishTime) : '';
};
