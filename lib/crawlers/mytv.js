const { fetch } = require('../utils.js');
const { matchBangumi } = require('../utils.js');

exports.getAll = async function getAll() {
  const api = 'https://content-api.mytvsuper.com/v1/programme/list?platform=web&tags[]=210&tags[]=67&offset=0&limit=9999';
  const json = await fetch(api).then((res) => res.json());
  return json.items.map((item) => ({
    id: item.path,
    lastVid: item.product_id,
    titleTranslate: { 'en': [item.name_en], 'zh-Hant': [item.name_tc] },
    img: item.image.landscape_large,
  }));
};

exports.getBegin = async function getBegin(id) {
  const api = `https://content-api.mytvsuper.com/v1/episode/list?programme_id=${id.split('_')[1]}&start_episode_no=1&end_episode_no=9999&platform=web`;
  const json = await fetch(api).then((res) => res.json());
  return json.items[0].pay_start_time ? new Date(json.items[0].pay_start_time).toISOString() : json.items[0].free_start_time ? new Date(json.items[0].free_start_time).toISOString() : '';
};

exports.matchBangumi = async (input, items) => {
  return matchBangumi(input, { items });
}
