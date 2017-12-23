const fetch = require('node-fetch');

function getExist(id) {
  const api = `http://www.acfun.cn/bangumi/video/page?bangumiId=${id}`;
  return fetch(api)
    .then(res => res.json())
    .then(({ data }) => ({ exist: !!data.totalCount }));
}

module.exports = async (id) => {
  let info = {};
  try {
    const { exist } = await getExist(id);
    info = { exist };
  } catch (e) {
    console.log(e);
  }
  return Object.assign({ site: 'acfun', id }, info);
};
