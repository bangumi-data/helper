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

async function getBegeinFromWebsite(mediaId) {
  const url = `https://www.bilibili.com/bangumi/media/md${mediaId}/`;
  const html = await fetch(url).then((res) => res.text());
  
  // before release
  let [pubMatch, year] = html.match(/"pub_date":"(\d{4})-\d{1,2}-\d{1,2}"/) || [];
  let [dateMatch, month, day, hour, minute] = html.match(/"release_date_show":"(\d{1,2})月(\d{1,2})日(\d{1,2}):(\d{1,2})开播"/) || [];
  if (pubMatch && dateMatch) {
    return parseDate(year, month, day, hour, minute);
  }
  // onair eg:
  // <div class="media-info-time"><span>2025年4月1日开播</span> <span>连载中, 每周二 22:30更新</span></div>
  let timeMatch;
  [dateMatch, year, month, day] = html.match(/"media-info-time".+?(\d{4})年(\d{1,2})月(\d{1,2})日开播/) || [];
  [timeMatch, hour, minute] = html.match(/"media-info-time".+?(\d{1,2}):(\d{1,2})更新/) || [, 8, 0];
  if (dateMatch) {
    // 已完结的与部分港台番剧将缺失 hour, minute 将自动填充为 T00:00Z
    return parseDate(year, month, day, hour, minute);
  }
  return null;
}

function parseDate(year, month, day, hour, minute) {
  try {
    const date = new Date(`${year}-${month}-${day} ${hour}:${minute}:00 +08:00`);
    return date;
  } catch (e) {
    console.error(e);
    return null;
  }
}

exports.getBegin = async function getBegin(mediaId, site) {
  const api = `https://bangumi.bilibili.com/view/web_api/media?media_id=${mediaId}`;
  const { result } = await fetch(api).then((res) => res.json()).catch(() => ({}));
  if (site && site === 'bilibili' && result?.episodes[0].mid === 11783021) {
    ora().fail(`uploader is 哔哩哔哩番剧出差 (mediaId: ${mediaId})`);
  } else if(site && site !== 'bilibili' && result?.episodes[0].mid !== 11783021){
    ora().fail(`uploader is not 哔哩哔哩番剧出差 (mediaId: ${mediaId})`);
  }
  let time = result?.episodes
    .filter((ep) => !Number.isNaN(Number(ep.index)))
    .map((ep) => new Date(`${ep.pub_real_time}+08:00`))
    .sort((a, b) => a - b)
    .shift();

  if (!time) {
    time = await getBegeinFromWebsite(mediaId);
  }

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
