const ora = require('ora');
const cheerio = require('cheerio');

const { fetch, matchBangumi } = require('../utils.js');

function getAreaRegex(area) {
  switch (area) {
    case 'hk_mo_tw':
      // 港澳台
      return /[（(]?僅限?港澳台(?:及其他)?(?:地區)?[）)]?$/g;
    case 'hk_mo':
      // 港澳
      return /[（(]?僅限?港澳(?:及其他)?(?:地區)?[）)]?$/g;
    case 'tw':
      // 台灣
      return /[（(]?僅限?台灣(?:及其他)?(?:地區)?[）)]?$/g;
    default:
      // 中國
      return /(?:[（(]?僅限?[港澳台灣]+(?:及其他)?(?:地區)?[）)]?)$/g;
  }
}

exports.getTitleByArea = function getTitleByArea(title, area) {
  return title.replace(getAreaRegex(area), '');
}

exports.getAllBangumi = async function getAllBangumi(page, totalPage, area) {
  const spinner = ora(`Crawling page ${page}/${totalPage || '?'}`).start();
  const perPage = 1000;
  const api = `https://api.bilibili.com/pgc/season/index/result?st=1&year=-1&season_version=-1&spoken_language_type=-1&area=-1&is_finish=-1&copyright=-1&season_status=-1&season_month=-1&style_id=-1&order=3&sort=0&page=${page}&season_type=1&pagesize=${perPage}&type=1`;
  const { code, message, data } = await fetch(api).then((res) => res.json());
  spinner.stop();
  if (code) {
    throw new Error(message);
  }
  const items = data.list.filter((item) => {
    if (area) { // 港,澳,台
      return getAreaRegex(area).test(item.title);
    } else {  // 中國
      return !getAreaRegex(area).test(item.title);
    }
  });
  const { num, size, total } = data;
  if (num * size < total) {
    return items.concat(await getAllBangumi(page + 1, Math.ceil(total / size), area));
  }
  return items;
}

exports.getAll = async function getAll() {
  const items = await exports.getAllBangumi(1);
  return items.map((item) => ({
    id: `${item.media_id}`,
    titleTranslate: { 'zh-Hans': [item.title] },
    img: item.cover,
    href: `https://www.bilibili.com/bangumi/media/md${item.media_id}/`,
  }));
};

/*
async function getBegeinBeforeRelease(mediaId) {
  const url = `https://www.bilibili.com/bangumi/media/md${mediaId}/`;
  const html = await fetch(url).then((res) => res.text());
  const [pubMatch, year] = html.match(/"pub_date":"(\d{4})-\d{1,2}-\d{1,2}"/) || [];
  const [dateMatch, month, day, hour, minute] = html.match(/"release_date_show":"(\d{1,2})月(\d{1,2})日(\d{1,2}):(\d{1,2})开播"/) || [];
  if (!pubMatch || !dateMatch) {
    return null;
  }

  try {
    const date = new Date(`${year}-${month}-${day} ${hour}:${minute}:00 +08:00`);
    return date;
  } catch (e) {
    console.error(e);
    return null;
  }
}
*/

async function callAPI(url) {
  const { code, result } = await fetch(url).then((res) => res.json());
  return code === 0 ? result : null;
}

exports.getBegin = async function getBegin(mediaId, site) {
  const mediaResult = await callAPI(`https://api.bilibili.com/pgc/review/user?media_id=${mediaId}`);
  const isOnair = mediaResult.media.new_ep.id !== 0;
  const seasonId = mediaResult.media.season_id;
  const seasonResult = await callAPI(`https://api.bilibili.com/pgc/view/web/season?season_id=${seasonId}`);

  let time = new Date(`${seasonResult.publish.pub_time}+08:00`);
  if (isOnair) {
    time = seasonResult.episodes
      .filter((ep) => (/^[\d-]+$/.test(ep.title) || ep.title === '正片' || ep.title === '全片' || ep.title === '原版') && ep.pub_time > 0)
      .map((ep) => new Date(ep.pub_time*1000))
      .sort((a, b) => a - b)
      .shift();
  }

  // 避免触发哔哩哔哩安全风控策略
  await new Promise(resolve => setTimeout(resolve, 1000));

  return time ? time.toISOString() : '';
};

exports.matchBangumi = async (input, items) => {
  return matchBangumi(input, { items });
}

exports.getIsBangumiOffline = async (id) => {
  const api = `https://www.bilibili.com/bangumi/media/md${id}/`;
  const $ = await fetch(api)
    .then((res) => res.text())
    .then(cheerio.load);
  return $('.error-container').length > 0;
}
