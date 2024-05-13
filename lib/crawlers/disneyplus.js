const cheerio = require('cheerio');
const { fetch } = require('../utils.js');
const { matchBangumi } = require('../utils.js');

const REGION = 'JP';
const API_VERSION = '6.0';

async function getAllByLang(lang = 'en', setId, page, titleOnly = false) {
  // fetch bangumi
  const url = `https://disney.content.edge.bamgrid.com/svc/content/CuratedSet/version/${API_VERSION}/region/${REGION}/audience/k-false,l-false/maturity/9999/language/${lang}/setId/${setId}/pageSize/60/page/${page}`;
  const json = await fetch(url).then((res) => res.json());

  let items;
  if (titleOnly) {
    items = json.data.CuratedSet.items.map((item) => {
      if (item.seriesType === null) {
        return {
          id: item.family.encodedFamilyId,
          title: item.text.title.full.program.default.content,
        };
      } else {
        return {
          id: item.encodedSeriesId,
          title: item.text.title.full.series.default.content,
        };
      }
    });
  } else {
    items = json.data.CuratedSet.items.map((item) => {
      if (item.seriesType === null) {
        return {
          id: item.family.encodedFamilyId,
          type: 'movies',
          title: item.text.title.full.program.default.content,
          slug: item.text.title.slug.program.default.content,
          image: item.image.tile[1.78].program.default.url,
        };
      } else {
        return {
          id: item.encodedSeriesId,
          type: 'series',
          title: item.text.title.full.series.default.content,
          slug: item.text.title.slug.series.default.content,
          image: item.image.tile[1.78].series.default.url,
        };
      }
    });
  }
  const { hits, offset, page_size } = json.data.CuratedSet.meta;
  if (page_size + offset < hits) {
    return items.concat(await getAllByLang(lang, setId, page + 1, titleOnly));
  }
  return items;
}

async function getAllSet(setIdList) {
  const json = [], jsonEN = [], jsonHK = [], jsonTW = [], jsonCN = [];
  for (const setId of setIdList) {
    const [tempJP, tempEN, tempHK, tempTW, tempCN] = await Promise.all([
      getAllByLang('ja-JP', setId, 1, false),
      getAllByLang('en', setId, 1, true),
      getAllByLang('zh-HK', setId, 1, true),
      getAllByLang('zh-Hant', setId, 1, true),
      getAllByLang('zh-Hans', setId, 1, true)
    ]);
    json.push(...tempJP);
    jsonEN.push(...tempEN);
    jsonHK.push(...tempHK);
    jsonTW.push(...tempTW);
    jsonCN.push(...tempCN);
  }
  return [json, jsonEN, jsonHK, jsonTW, jsonCN];
}

exports.getAll = async function getAll() {
  // find setId for 'Japanese Anime'
  const brandUrl = `https://disney.content.edge.bamgrid.com/svc/content/Collection/StandardCollection/version/${API_VERSION}/region/${REGION}/audience/k-false,l-true/maturity/9999/language/en-GB/contentClass/editorial/slug/anime`;
  const brandJson = await fetch(brandUrl).then((res) => res.json());
  const setIdList = brandJson.data.Collection.containers.map((item) => item.set.refId);

  const [json, jsonEN, jsonHK, jsonTW, jsonCN] = await getAllSet(setIdList);

  return json.map((item) => {
    const id = item.id;
    const url = item.type === 'series' ? null : `https://www.disneyplus.com/${item.type}/${item.slug}/${id}`; // override url for non series program

    // group title in different language
    const titleEN = jsonEN.find(i => id == i.id);
    const titleHK = jsonHK.find(i => id == i.id);
    const titleTW = jsonTW.find(i => id == i.id);
    const titleCN = jsonCN.find(i => id == i.id);

    let titleTranslate = {};
    if (titleCN) {
      titleTranslate['zh-Hans'] = [titleCN.title];
    }
    if (titleHK && titleTW) {
      if (titleHK.title === titleTW.title) {
        titleTranslate['zh-Hant'] = [titleTW.title];
      } else {
        titleTranslate['zh-Hant'] = [titleTW.title, titleHK.title];
      }
    } else if (titleHK) {
      titleTranslate['zh-Hant'] = [titleHK.title];
    } else if (titleTW) {
      titleTranslate['zh-Hant'] = [titleTW.title];
    }
    if (titleEN) {
      titleTranslate['en'] = [titleEN.title];
    }

    return {
      title: item.title,
      id: id,
      url: url,
      titleTranslate: titleTranslate,
      image: item.image,
    }
  });
};

exports.getBegin = async function getBegin(id) {
  return '';
  /* not site on-air date, only have bangumi release date
  const url = `https://disney.content.edge.bamgrid.com/svc/content/DmcSeriesBundle/version/6.0/region/TW/audience/k-false,l-false/maturity/9999/language/zh-Hant/encodedSeriesId/${id}`;
  const json = await fetch(url).then((res) => res.json());
  const date = json.data.DmcSeriesBundle.series.releases[0].releaseDate;
  return date ? new Date(date).toISOString() : '';*/
};

exports.matchBangumi = async (input, items) => {
  return matchBangumi(input, { items });
}
