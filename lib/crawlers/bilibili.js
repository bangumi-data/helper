const ora = require('ora');

const { fetch } = require('../utils.js');

async function getAllBangumi(page, totalPage) {
  const spinner = ora(`Crawling page ${page}/${totalPage || '?'}`).start();
  const perPage = 30;
  const api = `https://bangumi.bilibili.com/media/web_api/search/result?season_version=-1&area=-1&is_finish=-1&copyright=-1&season_status=-1&season_month=-1&pub_date=-1&style_id=-1&order=5&st=1&sort=0&page=${page}&season_type=1&pagesize=${perPage}`;
  const { code, message, result } = await fetch(api).then((res) => res.json());
  spinner.stop();
  if (code) {
    throw new Error(message);
  }
  const items = result.data;
  const { num, size, total } = result.page;
  if (num * size < total) {
    return items.concat(await getAllBangumi(page + 1, Math.floor(total / size)));
  }
  return items;
}

exports.getAll = async function getAll() {
  const items = await getAllBangumi(1);
  return items.map((item) => ({
    id: `${item.media_id}`,
    title: item.title,
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

exports.getBegin = async function getBegin(mediaId) {
  const api = `https://bangumi.bilibili.com/view/web_api/media?media_id=${mediaId}`;
  const { result } = await fetch(api).then((res) => res.json());
  let time = result.episodes
    .filter((ep) => !Number.isNaN(Number(ep.index)))
    .map((ep) => new Date(`${ep.pub_real_time} +08:00`))
    .sort((a, b) => a - b)
    .shift();

  if (!time) {
    time = await getBegeinBeforeRelease(mediaId);
  }

  return time ? time.toISOString() : '';
};
