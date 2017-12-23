const fetch = require('node-fetch');

/**
 * 获取番剧信息
 * @param  {String} id 番剧 ID
 * @return {Object}
 */
function getInfo(id) {
  const api = `http://d.api.m.le.com/detail/episode?pid=${id}&platform=pc&page=1&pagesize=50`;
  return fetch(api)
    .then(res => res.json())
    .then(({ data }) => ({
      premuiumOnly: data.list.some(({ ispay }) => ispay),
      exist: data.list.some(({ video_type: videoType }) => videoType['180001'] === '正片'),
    }));
}

module.exports = async (id) => {
  let info = {};
  try {
    info = await getInfo(id);
  } catch (e) {
    console.log(e);
  }
  return Object.assign({ site: 'letv', id }, info);
};
