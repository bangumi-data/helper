const ora = require('ora');

const { fetch } = require('../utils.js');

async function getAllBangumi(page, totalPage) {
  const spinner = ora(`Crawling page ${page}/${totalPage || '?'}`).start();
  const perPage = 30;
  const api = `https://bangumi.bilibili.com/media/web_api/search/result?season_version=-1&area=-1&is_finish=-1&copyright=-1&season_status=-1&season_month=-1&pub_date=-1&style_id=-1&order=5&st=1&sort=0&page=${page}&season_type=1&pagesize=${perPage}`;
  const { code, message, result } = await fetch(api).then(res => res.json());
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
  return items.map(item => ({
    id: `${item.season_id}`,
    title: item.title,
    begin: new Date(item.order.pub_real_time * 1e3).toISOString() || '',
    img: item.cover,
  }));
};

/**
 * 获取放送时间、是否官方、是否收费
 * @param  {Number} seasonId 番剧 ID
 * @return {Object}
 */
async function getData(seasonId) {
  const api = `https://bangumi.bilibili.com/view/web_api/season?season_id=${seasonId}`;
  const { code, message, result } = await fetch(api).then(res => res.json());
  if (code) {
    throw new Error(message);
  }
  const pubTime = new Date(`${result.publish.pub_time} +08:00`).toISOString() || '';
  return {
    // 开播前 pub_time 不准确
    begin: result.episodes.length ? pubTime : '',
    official: ['bilibili', 'dujia', 'cooperate'].includes(result.rights.copyright),
    premuiumOnly: !!(result.payment && result.payment.price * 1),
    exist: !!result.episodes.length,
  };
}

exports.getInfo = async function getInfo(id) {
  try {
    const { begin, official, premuiumOnly, exist } = await getData(id);
    return { begin, official, premuiumOnly, exist };
  } catch (err) {
    console.log(err);
    return {};
  }
};
