const fetch = require('node-fetch');
const { getInfo } = require('./youtu.js');

/**
 * 获取第一集 ID
 * @param  {String} acode 番剧 ID
 * @return {String}       第一集 ID
 */
function getVid(proId) {
  const api = `http://index.youku.com/ProAction!getProVideos.action?pageIndex=0&pageSize=10000&type=main&tag=youku&proId=${proId}`;
  return fetch(api)
    .then(res => res.json())
    .then(json => json.videos.pop().split('^')[0]);
}

module.exports = function(id) {
  return getVid(id)
    .then(getInfo)
    .then(info => Object.assign({ site: 'youku', id }, info))
    .catch(console.log);
};
