const dayjs = require('dayjs');
const { fetch } = require('../utils.js');
const ora = require('ora');

/**
 * Fetches and merges data from the Anime Offline Database and Anime Lists.
 */

const aodbUrl = 'https://github.com/manami-project/anime-offline-database/releases/download/latest/anime-offline-database-minified.json';
const animeListsUrl = 'https://raw.githubusercontent.com/Anime-Lists/anime-lists/master/anime-list.xml';

function toNumber(v) {
  return v && /^\d+$/.test(v) ? v : undefined;
}

function buildOutput(item, site) {
  let siteId = undefined;
  if (site === 'mal') {
    if (item.myanimelistid) {
      siteId = item.myanimelistid;
    }
  } else if (site === 'aniList') {
    if (item.aniListid) {
      siteId = item.aniListid;
    }
  } else if (site === 'anidb') {
    if (item.anidbid) {
      siteId = item.anidbid;
    }
  } else if (site === 'tmdb') {
    if (item.tmdbid) {
      siteId = `movie/${item.tmdbid}`;
    } else if (item.tmdbtv) {
      siteId = `tv/${item.tmdbtv}`;
      if (item.tmdbseason && String(item.tmdbseason) !== '1') {
        siteId = `tv/${item.tmdbtv}/season/${item.tmdbseason}`;
      }
    }
  }

  if (siteId) {
    return {
      ...item,
      id: siteId,
    };
  }
  return null;
}

/**
 *
 * @param {string} site
 * @returns {string} id - id of input param site
 * @returns {string} title - title in Japanese
 * @returns {array} titleTranslate - title in Chinese or English
 * @returns {string} year
 * @returns {string} season - SPRING / SUMMER / FALL / WINTER / UNDEFINED
 * @returns {string} all ID of different sites
 */
exports.getAll = async function getAll(site) {
  const spinner = ora('Downloading data - Anime Offline Database').start();
  const aodb = await fetch(aodbUrl).then((res) => res.json());
  spinner.text = 'Downloading data - Anime Lists';
  const animeList = await fetch(animeListsUrl).then((res) => res.text());

  spinner.text = 'Merging data';
  const aodbMap = new Map();
  const aodbNoAnidbList = [];
  if (aodb && Array.isArray(aodb.data)) {
    spinner.info(`Anime Offline Database size: ${aodb.data.length}`);
    for (const item of aodb.data) {
      const title = item && item.title ? item.title : undefined;
      const animeSeason =
        item && item.animeSeason ? item.animeSeason : undefined;
      const synonyms = Array.isArray(item.synonyms)
        ? item.synonyms.filter((s) => /[\p{sc=Latn}\p{sc=Han}\p{sc=Katakana}\p{sc=Hiragana}]/u.test(s))
        : [];
      let anidbid = undefined;
      let aniListid = undefined;
      let myanimelistid = undefined;
      if (Array.isArray(item.sources)) {
        for (const s of item.sources) {
          if (!anidbid) {
            const m = String(s).match(/https?:\/\/anidb\.net\/anime\/(\d+)/);
            if (m) anidbid = m[1];
          }
          if (!aniListid) {
            const m = String(s).match(/https?:\/\/anilist\.co\/anime\/(\d+)/);
            if (m) aniListid = m[1];
          }
          if (!myanimelistid) {
            const m = String(s).match(/https?:\/\/myanimelist\.net\/anime\/(\d+)/);
            if (m) myanimelistid = m[1];
          }
          if (anidbid && myanimelistid && aniListid) break;
        }
      }
      const obj = {
        anidbid: anidbid ? String(anidbid) : undefined,
        aniListid: aniListid ? String(aniListid) : undefined,
        myanimelistid: myanimelistid ? String(myanimelistid) : undefined,
        title: [title, ...synonyms],
        ...animeSeason,
      };
      if (anidbid) {
        aodbMap.set(String(anidbid), obj);
      } else {
        aodbNoAnidbList.push(obj);
      }
    }
  }
  spinner.info(`Anime Offline Database size (with aniDB id): ${aodbMap.size}`);
  spinner.info(`Anime Offline Database size (without aniDB id): ${aodbNoAnidbList.length}`);

  const animeListMap = new Map();
  if (animeList) {
    const animeTagRe = /<anime\s+([^>]+)>/g;
    let m;
    while ((m = animeTagRe.exec(animeList))) {
      const attrsStr = m[1];
      const attrRe = /(\w+)="(.*?)"/g;
      let a;
      const attrs = {};
      while ((a = attrRe.exec(attrsStr))) {
        attrs[a[1]] = a[2];
      }
      if (!attrs.anidbid) continue;
      animeListMap.set(String(attrs.anidbid), {
        anidbid: String(attrs.anidbid),
        tvdbid: toNumber(attrs.tvdbid),
        tmdbtv: toNumber(attrs.tmdbtv),
        tmdbseason: toNumber(attrs.tmdbseason),
        tmdbid: toNumber(attrs.tmdbid),
        imdbid: toNumber(attrs.imdbid),
      });
    }
  }
  spinner.info(`Anime Lists size: ${animeListMap.size}`);

  const items = [];
  // process bangumi can merge
  for (const id of aodbMap.keys()) {
    const fromA = aodbMap.get(id);
    const fromB = animeListMap.get(id) || {};
    items.push(buildOutput({
      ...fromA,
      ...fromB,
    }, site));
  }

  // process remaining bangumi
  aodbNoAnidbList.forEach((i) => items.push(buildOutput(i, site)));

  spinner.stop();

  return items
    .filter((item) => item != null && item.id != null)
    .map((item) => {
      let title = undefined;
      let titleTranslate = undefined;
      for (let i = 0; i < item.title.length; i++) {
        const element = item.title[i];
        let lang = null;
        if (/[\p{sc=Katakana}\p{sc=Hiragana}]/u.test(element)) {
          // 日文
          lang = 'ja';
        } else if (/[\p{sc=Han}]/u.test(element)) {
          // 中文
          lang = 'zh-Hans';
        } else if (/[\p{sc=Latn}]/u.test(element))  {
          lang = 'en';
        }

        if (lang === 'ja') {
          title = element;
        } else if (lang !== null) {
          if (!titleTranslate) {
            titleTranslate = {};
          }
          let titles = titleTranslate[lang] ?? [];
          titles.push(element)
          titleTranslate[lang] = titles;
        }
      }

      return {
        id: item.id,
        title,
        titleTranslate,
        year: item.year,
        season: item.season,
        myanimelistid: item.myanimelistid,
      };
    });
};

exports.matchBegin = (bangumiBeginDate, item) => {
  let month = [];
  switch (item.season) {
    case 'SPRING':
      month = [3, 4, 5, 6];
      break;
    case 'SUMMER':
      month = [6, 7, 8, 9];
      break;
    case 'FALL':
      month = [9, 10, 11, 12];
      break;
    case 'WINTER':
      month = [12, 1, 2, 3];
      break;
  }
  return (
    dayjs(bangumiBeginDate).year() === parseInt(item.year) &&
    month.includes(dayjs(bangumiBeginDate).month() + 1)
  );
};
