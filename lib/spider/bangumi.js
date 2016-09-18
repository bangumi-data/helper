const fetch = require('node-fetch');

/**
 * 搜索，获取 Bangumi ID 和中文标题
 * @param  {Object} item 番剧数据对象
 * @return {Promise}
 */
function search(item) {
  const api = `https://api.bgm.tv/search/subject/${encodeURIComponent(item.title)}?responseGroup=large`;
  return fetch(api)
    .then(res => res.json())
    .then(json =>
      json.list
        .filter(l => l.type === 2)
        .filter(l => l.name === item.title)
        // TODO: 可能会差一天
        .filter(l => l['air_date'] === item.begin.slice(0, 10))
    );
}

module.exports = function(item) {
  return search(item)
    .then(results => {
      if (!results.length) {
        return {};
      }
      const result = results[0];
      const obj = { sites: [{ site: 'bangumi', id: `${result.id}` }] };
      if (result['name_cn']) {
        obj.titleTranslate = { 'zh-Hans': [result['name_cn']] };
      }
      return obj;
    })
    .catch(console.log);
};
