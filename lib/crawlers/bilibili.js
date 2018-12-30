const fetch = require('node-fetch');
const ora = require('ora');

exports.getAll = async function getAll() {
  const spinner = ora('Crawling').start();
  const api = 'https://bangumi.bilibili.com/web_api/season/index_global?page=1&page_size=233333&version=0&is_finish=0&start_year=0&tag_id=&index_type=0&index_sort=0&area=2&quarter=0';
  const { code, message, result } = await fetch(api).then(res => res.json());
  spinner.stop();
  if (code) {
    throw new Error(message);
  }
  return result.list.map(item => ({
    id: item.season_id,
    title: item.title,
    begin: new Date(item.pub_time * 1e3).toISOString() || '',
    img: item.img,
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
