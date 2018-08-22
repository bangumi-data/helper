const cheerio = require('cheerio');
const fetch = require('node-fetch');

const TYPE_MAP = {
  剧场版: 'movie',
  TV: 'tv',
  OVA: 'ova',
  WEB: 'web',
  其他: '',
};

async function getType(id) {
  const api = `https://bgm.tv/subject/${id}`;
  const $ = await fetch(api)
    .then(res => res.text())
    .then(cheerio.load);
  return TYPE_MAP[$('#headerSubject .nameSingle small').text()];
}

/**
 * 搜索，获取 Bangumi ID 和中文标题
 * @param  {Object} item 番剧数据对象
 * @return {Promise}
 */
async function search(item) {
  // Bangumi 搜索 API 在有某些特殊字符的情况下直接返回 404
  const encoded = encodeURIComponent(
    item.title
      .replace(/[-.\\/*!'()]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim(),
  );
  const api = `https://api.bgm.tv/search/subject/${encoded}?responseGroup=large`;
  const headers = { Cookie: `chii_searchDateLine=${Date.now() / 1e3 | 0}` };
  const { error, list } = await fetch(api, { headers }).then(res => res.json());
  if (error) {
    throw new Error(error);
  }
  return list
    .filter(li => li.type === 2)
    .filter(li => Math.abs(new Date(item.begin) - new Date(li.air_date)) < 8.64e7);
}

exports.getMeta = async function getMeta(item) {
  try {
    const results = await search(item);
    if (!results.length) {
      return {};
    }
    const result = results[0];
    return {
      titleTranslate: result.name_cn
        ? { 'zh-Hans': [result.name_cn.replace(/&amp;/g, '&')] }
        : {},
      type: await getType(result.id),
      sites: [{ site: 'bangumi', id: String(result.id) }],
    };
  } catch (err) {
    console.log(err);
    return {};
  }
};
