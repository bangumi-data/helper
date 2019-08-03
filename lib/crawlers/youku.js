const ora = require('ora');

const { fetch } = require('../utils.js');

async function correctId(href) {
  const api = href.startsWith('//') ? `https:${href}` : href;
  const html = await fetch(api).then(res => res.text());
  const [, id] = html.match(/id_z(\w{20})\.html/) || [];
  return id;
}

async function getAllBangumi(condition, page = 1, total = 0) {
  const spinner = ora(`Crawling page ${page}/${total || '?'} with conditions: ${[condition.time, condition.version || '全部']}`).start();
  const api = `https://list.youku.com/category/page?c=100&a=%E6%97%A5%E6%9C%AC&s=6&d=2&p=${page}&r=${condition.r}&av=${condition.av || ''}&type=show`;
  const { code, message, data } = await fetch(api).then(res => res.json());
  spinner.stop();
  if (code) {
    throw new Error(message);
  }
  const items = data
    .filter(item => item.access === 'allow')
    .map(item => ({
      title: item.title,
      href: item.videoLink,
      img: item.img,
      info: item.summary,
    }));
  if (data.length) {
    return items.concat(await getAllBangumi(condition, page + 1));
  }
  return items;
}

exports.getAll = async function getAll() {
  console.log('It may take 20~30 minutes.');
  // 优酷一个搜索条件最多显示 1200 项结果，故分多个搜索条件获得所有结果
  const conditions = [
    ...(() => {
      const cs = [];
      for (let year = new Date().getUTCFullYear(); year >= 2010; year--) {
        cs.push({ r: String(year), time: String(year) });
      }
      return cs;
    })(),
    { r: '2000', time: '00年代', av: '1', version: 'TV版' },
    { r: '2000', time: '00年代', av: '2', version: 'OVA版' },
    { r: '2000', time: '00年代', av: '3', version: '剧场版' },
    { r: '2000', time: '00年代', av: '5', version: '其他' },
    { r: '1990', time: '90年代' },
    { r: '1980', time: '80年代' },
    { r: '1970', time: '70年代' },
    { r: '-1969', time: '更早' },
  ];
  const items = await conditions.reduce((sequence, condition) => sequence.then(async (results) => {
    const data = await getAllBangumi(condition);
    return results.concat(data);
  }), Promise.resolve([]));
  await items.reduce((sequence, item, idx) => sequence.then(async () => {
    const spinner = ora(`[${idx}/${items.length}]Correcting ID of ${item.title}`).start();
    try {
      const id = await correctId(item.href);
      Object.assign(item, { id });
    } catch (err) {
      console.log(err);
    }
    spinner.stop();
  }), Promise.resolve());
  return items.filter(({ id }) => id);
};

exports.getBegin = async function getBegin(rawId) {
  const proId = rawId.slice(-20);
  const CLIENT_ID = 'f8c97cdf52e7a346';
  const api = `https://openapi.youku.com/v2/shows/videos.json?client_id=${CLIENT_ID}&show_id=${proId}&count=1`;
  const { videos } = await fetch(api).then(res => res.json());
  return videos.length
    ? new Date(`${videos[0].published}+08:00`).toISOString()
    : '';
};
