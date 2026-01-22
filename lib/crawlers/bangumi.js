const cheerio = require('cheerio');

const { fetch } = require('../utils.js');

const TYPE_MAP = {
  剧场版: 'movie',
  TV: 'tv',
  OVA: 'ova',
  WEB: 'web',
  其他: '',
};

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

function getTitleTranslate(data) {
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
        if (/[\p{sc=Katakana}\p{sc=Hiragana}]/u.test(value.v)) {  // 日文
          return null;
        } else if (/\p{sc=Hangul}/u.test(value.v)) {  // 韩文
          return null;
        } else if (/\p{sc=Han}/u.test(value.v)) {  // 中文
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

async function getApiData(subject_id) {
  const api = `https://api.bgm.tv/v0/subjects/${subject_id}`;
  const headers = { 'User-Agent': 'bangum-helper-dev' };
  return await fetch(api, { headers }).then((res) => res.json());
}

/**
 * @param  {String} 日期, 格式: YYYY-MM-DD 或 YYYY年MM月DD日
 * @return {Date}
 */
function parseDate(dateString) {
  if (/\d+/g.test(dateString)) {
    const [year, month, day] = dateString.match(/\d+/g);
    return new Date(year, month - 1, day);
  }
  return undefined;
}

exports.getMeta = async function getMeta(item) {
  try {
    const results = await search(item);
    if (!results.length) {
      return {};
    }
    const result = results[0];
    const bangumiData = await getApiData(result.id);
    return {
      titleTranslate: getTitleTranslate(bangumiData),
      type: TYPE_MAP[bangumiData.platform],
      sites: [{ site: 'bangumi', id: String(result.id) }],
    };
  } catch (err) {
    console.log(err);
    return {};
  }
};

exports.getMetaFull = async function getMeta(subject_id) {
  try {
    const bangumiData = await getApiData(subject_id);
    const type = TYPE_MAP[bangumiData.platform];
    const begin = parseDate(bangumiData.date).toISOString() ?? '';
    let url = '', end = '';
    if (bangumiData.infobox) {
      const infoboxUrl = bangumiData.infobox.filter((item) => item.key === '官方网站');
      if (infoboxUrl.length > 0) {
        url = infoboxUrl[0].value;
      }

      const infoboxEnd = bangumiData.infobox.filter((item) => item.key === '播放结束' || item.key == '结束');
      if (infoboxEnd.length > 0) {
        end = parseDate(infoboxEnd[0].value).toISOString() ?? '';
      }

      if (begin !== '' && type === 'movie') {
        const infoboxLength = bangumiData.infobox.filter((item) => item.key === '片长');
        if (infoboxLength.length > 0 && /\d+/g.test(infoboxLength[0].value)) {
          const minute = parseInt(infoboxLength[0].value.match(/\d+/g)[0]);
          let date = new Date(begin);
          date.setMinutes(date.getMinutes() + minute);
          end = date.toISOString();
        } else {
          end = begin;
        }
      }
    }
    return {
      title: bangumiData.name,
      titleTranslate: getTitleTranslate(bangumiData),
      type: type,
      lang: 'ja',
      officialSite: url,
      begin: begin,
      broadcast: type === 'tv' ? `R/${begin}/P7D` : '',
      end: end,
      comment: '',
      sites: [{ site: 'bangumi', id: String(bangumiData.id) }],
    };
  } catch (err) {
    console.log(err);
    return {};
  }
};
