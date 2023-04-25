const cheerio = require('cheerio');

const { fetch } = require('../utils.js');

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
    .then((res) => res.text())
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
  const { error, list } = await fetch(api, { headers }).then((res) => res.json());
  if (error) {
    throw new Error(error);
  }
  return list
    .filter((li) => li.type === 2)
    .filter((li) => Math.abs(new Date(item.begin) - new Date(li.air_date)) < 8.64e7);
}

async function getTitleTranslate(subject_id) {
  const api = `https://api.bgm.tv/v0/subjects/${subject_id}`;
  const headers = { 'User-Agent': 'bangum-helper-dev' };
  const data = await fetch(api, { headers }).then((res) => res.json());
  let titleTranslate = data.name_cn ? { 'zh-Hans': [data.name_cn.replace(/&amp;/g, '&')] } : {};
  if (data.infobox) {
    const aliasList = data.infobox.filter((item) => item.key === '别名');
    if (aliasList.length > 0) {
      let aliasValueList;
      if (Array.isArray(aliasList[0].value)) {
        aliasValueList = aliasList[0].value;
      } else {
        aliasValueList = [aliasList[0].value];
      }
      return aliasValueList.map((value) => {
        let lang = 'en';
        if (/.*[\u3040-\u309f\u30a0-\u30ff]+.*/.test(value.v)) {  // 日文
          return null;
        } else if (/.*[\uAC00-\uD79D]+.*/.test(value.v)) {  // 韩文
          return null;
        } else if (/.*[\u4e00-\u9fa5]+.*/.test(value.v)) {  // 中文
          lang = 'zh-Hans';
        } else {
          return null;
        }
        return {
          lang: lang,
          title: value.v.replace(/&amp;/g, '&')
        }
      })
        .filter((item) => item != null)
        .reduce((acc, item) => {
          const lang = item.lang;
          if (!acc[lang]) {
            acc[lang] = [];
          }
          acc[lang].push(item.title);
          return acc;
        }, titleTranslate);
    }
  }
  return titleTranslate;
}

exports.getMeta = async function getMeta(item) {
  try {
    const results = await search(item);
    if (!results.length) {
      return {};
    }
    const result = results[0];
    return {
      titleTranslate: await getTitleTranslate(result.id),
      type: await getType(result.id),
      sites: [{ site: 'bangumi', id: String(result.id) }],
    };
  } catch (err) {
    console.log(err);
    return {};
  }
};
