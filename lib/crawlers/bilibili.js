const ora = require('ora');

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
  const perPage = 30;
  const api = `https://bangumi.bilibili.com/media/web_api/search/result?season_version=-1&area=-1&is_finish=-1&copyright=-1&season_status=-1&season_month=-1&pub_date=-1&style_id=-1&order=5&st=1&sort=0&page=${page}&season_type=1&pagesize=${perPage}`;
  const { code, message, result } = await fetch(api).then((res) => res.json());
  spinner.stop();
  if (code) {
    throw new Error(message);
  }
  const items = result.data.filter((item) => {
    if (area) { // 港,澳,台
      return getAreaRegex(area).test(item.title);
    } else {  // 中國
      return !getAreaRegex(area).test(item.title);
    }
  });
  const { num, size, total } = result.page;
  if (num * size < total) {
    return items.concat(await getAllBangumi(page + 1, Math.floor(total / size), area));
  }
  return items;
}

exports.getAll = async function getAll() {
  const items = await exports.getAllBangumi(1);
  return items.map((item) => ({
    id: `${item.media_id}`,
    titleTranslate: { 'zh-Hans': [item.title] },
    begin: new Date(item.order.pub_real_time * 1e3).toISOString() || '',
    img: item.cover,
    href: `https://www.bilibili.com/bangumi/media/md${item.media_id}/`,
  }));
};

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

exports.getBegin = async function getBegin(mediaId, site) {
  const api = `https://bangumi.bilibili.com/view/web_api/media?media_id=${mediaId}`;
  const { result } = await fetch(api).then((res) => res.json());
  if (site && site === 'bilibili' && result.episodes[0].mid === 11783021) {
    ora().fail(`uploader is 哔哩哔哩番剧出差 (mediaId: ${mediaId})`);
  } else if(site && site !== 'bilibili' && result.episodes[0].mid !== 11783021){
    ora().fail(`uploader is not 哔哩哔哩番剧出差 (mediaId: ${mediaId})`);
  }
  let time = result.episodes
    .filter((ep) => !Number.isNaN(Number(ep.index)))
    .map((ep) => new Date(`${ep.pub_real_time}+08:00`))
    .sort((a, b) => a - b)
    .shift();

  if (!time) {
    time = await getBegeinBeforeRelease(mediaId);
  }

  return time ? time.toISOString() : '';
};

exports.matchBangumi = async (input, items) => {
  return matchBangumi(input, { items });
}
