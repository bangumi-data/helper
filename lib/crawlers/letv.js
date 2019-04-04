const ora = require('ora');

const { fetch } = require('../utils.js');

exports.getAll = async function getAll(page = 1) {
  const spinner = ora(`Crawling page ${page}/?`).start();
  const api = `https://list.le.com/getLesoData?from=pc&src=1&stype=1&ps=30&pn=${page}&ph=420001&dt=1&cg=5&or=5&stt=1&ar=50041&s=1`;
  const json = await fetch(api).then(res => res.json());
  spinner.stop();
  const items = json.data.arr
    .map(({ aid, name, imgUrl }) => ({ id: aid, title: name, img: imgUrl }));
  if (json.data.more) {
    return items.concat(await getAll(page + 1));
  }
  return items;
};

/**
 * 获取番剧信息
 * @param  {String} id 番剧 ID
 * @return {Object}
 */
async function getData(id) {
  const api = `http://d.api.m.le.com/detail/episode?pid=${id}&platform=pc&page=1&pagesize=50`;
  const { data } = await fetch(api).then(res => res.json());
  return {
    premuiumOnly: data.list.some(({ ispay }) => ispay),
    exist: data.list.some(({ video_type: videoType }) => videoType['180001'] === '正片'),
  };
}

exports.getInfo = async function getInfo(id) {
  try {
    const { premuiumOnly, exist } = await getData(id);
    return { premuiumOnly, exist };
  } catch (err) {
    console.log(err);
    return {};
  }
};
