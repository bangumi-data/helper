const cheerio = require('cheerio');
const { fetch } = require('../utils.js');
const { matchBangumi } = require('../utils.js');

async function getAllByLang(lang = 'en', page, titleOnly = false) {
  const url = `https://disney.content.edge.bamgrid.com/svc/content/CuratedSet/version/6.0/region/TW/audience/k-false,l-false/maturity/9999/language/${lang}/setId/da46f23f-543b-4f9d-9cb6-af7451cf9e23/pageSize/60/page/${page}`;
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
    return items.concat(await getAllByLang(lang, page + 1, titleOnly));
  }
  return items;
}

exports.getAll = async function getAll() {
  const [json, jsonEN, jsonHK, jsonTW, jsonCN] = await Promise.all([
    getAllByLang('ja-JP', 1),
    getAllByLang('en', 1, true),
    getAllByLang('zh-HK', 1, true),
    getAllByLang('zh-Hant', 1, true),
    getAllByLang('zh-Hans', 1, true)
  ]);

  return json.map((item) => {
    const id = item.id;
    const url = item.type === 'series' ? null : `https://www.disneyplus.com/${item.type}/${item.slug}/${id}`; // override url for non series program

    // group title in different language
    const titleEN = jsonEN.find(i => id == i.id);
    const titleHK = jsonHK.find(i => id == i.id);
    const titleTW = jsonTW.find(i => id == i.id);
    const titleCN = jsonCN.find(i => id == i.id);

    let titleTranslate = {
      'ja': [item.title]
    };
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
