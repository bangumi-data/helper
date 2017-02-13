const fetch = require('node-fetch');

/**
 * 搜索，获取 Bangumi ID 和中文标题
 * @param  {Object} item 番剧数据对象
 * @return {Promise}
 */
function search(item) {
  const api = `https://api.bgm.tv/search/subject/${escape(item.title)}?responseGroup=large`;
  return fetch(api)
    .then(res => res.json())
    .then(json =>
      json.list
        .filter(l => l.type === 2)
        .filter(l => Math.abs(new Date(item.begin) - new Date(l.air_date)) < 8.64e7)
    );
}

module.exports = item =>
  search(item)
    .then((results) => {
      if (!results.length) {
        return {};
      }
      const result = results[0];
      const obj = { sites: [{ site: 'bangumi', id: `${result.id}` }] };
      if (result.name_cn) {
        obj.titleTranslate = { 'zh-Hans': [result.name_cn] };
      }
      return obj;
    })
    .catch(console.log);
