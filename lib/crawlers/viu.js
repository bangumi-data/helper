const fs = require('fs-extra');
const path = require('path');
const ora = require('ora');
const { fetch } = require('../utils.js');

async function getIdMap() {
  const spinner = ora('Fetching Viu ID Map').start();
  const api = 'https://cdn.jsdelivr.net/gh/bangumi-data/helper@master/lib/crawlers/dicts/viu.json';
  const remote = await fetch(api).then((res) => (res.ok ? res.json() : {})).catch(() => ({}));
  const idMapFile = path.resolve(__dirname, './dicts/viu.json');
  const local = await fs.readJSON(idMapFile).catch(() => ({}));
  spinner.stop();
  return { ...local.ID_MAP, ...remote.ID_MAP };
}

async function saveIdMap(ID_MAP) {
  const outputFile = path.resolve(__dirname, './dicts/viu.json');
  await fs.outputJson(outputFile, { ID_MAP }, { spaces: 2 });
}

async function correctId(id) {
  const api = `https://www.viu.com/ott/hk/index.php?area_id=1&language_flag_id=1&r=vod/ajax-detail&platform_flag_label=web&area_id=1&language_flag_id=1&product_id=${id}&ut=0`;
  const json = await fetch(api).then((res) => res.json());
  return json.data.series.product[json.data.series.product.length - 1].product_id || id;
}

exports.getAll = async function getAll() {
  const api = 'https://www.viu.com/ott/hk/index.php?r=category/series-category&platform_flag_label=web&area_id=1&language_flag_id=1&is_movie=0&category_id=18&length=-1';
  const json = await fetch(api).then((res) => res.json());
  const items = json.data.series.map((item) => ({
    id: item.product_id,
    lastVid: item.product_id,
    title: item.name,
    img: item.series_image_url,
  }));

  // correct id from last video to first video
  let ID_MAP = await getIdMap();
  await items.reduce((sequence, item, idx) => sequence.then(async () => {
    const spinner = ora(`[${idx}/${items.length}]Correcting ID of ${item.title}`).start();
    try {
      let id;
      if (ID_MAP[item.lastVid]) {
        id = ID_MAP[item.lastVid];
      } else {
        id = await correctId(item.lastVid);
        ID_MAP[item.lastVid] = id;
      }
      Object.assign(item, { id });
    } catch (err) {
      console.log(err);
    }
    spinner.stop();
  }), Promise.resolve());

  // remove dupicate from ID_MAP, keep last pair of "lastVid": "firstVid"
  ID_MAP = Object.fromEntries(
    Object.entries(ID_MAP)
      .reverse()
      .filter((v, i, a) => a.findIndex((t) => (t[1] === v[1])) === i)
      .reverse(),
  );
  // save ID_MAP
  await saveIdMap(ID_MAP);
  return items;
};

exports.getBegin = async function getBegin(id) {
  const api = `https://www.viu.com/ott/hk/index.php?area_id=1&language_flag_id=1&r=vod/ajax-detail&platform_flag_label=web&area_id=1&language_flag_id=1&product_id=${id}&ut=0`;
  const json = await fetch(api).then((res) => res.json());
  return new Date(json.data.series.schedule_start_time * 1000).toISOString();
};
