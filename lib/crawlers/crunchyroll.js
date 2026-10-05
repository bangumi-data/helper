const fs = require('fs-extra');
const path = require('path');
const ora = require('ora');
const { delay, fetch, matchBangumi } = require('../utils.js');
const { homedir } = require('os');

const apiAuth = 'https://www.crunchyroll.com/auth/v1/token';
const apiBeta = 'https://beta-api.crunchyroll.com';
const apiBrowse = `${apiBeta}/content/v2/discover/browse`;
const apiCms = `${apiBeta}/content/v2/cms`;
const apiSeasons = `${apiBeta}/content/v2/cms/series/{{id}}/seasons`;
const apiEpisodes = `${apiBeta}/content/v2/cms/seasons/{{id}}/episodes`;
const authBasic = "Basic bm9haWhkZXZtXzZpeWcwYThsMHE6";
const userAgent = 'Crunchyroll/3.81.6 Android/16';

async function getHeaders() {
  const dictFile = path.resolve(homedir(), '.config', 'bangumi-helper', 'crunchyroll.json');
  const local = await fs.readJSON(dictFile).catch(() => ({}));
  return local.headers;
}

async function saveHeaders(headers) {
  const outputFile = path.resolve(homedir(), '.config', 'bangumi-helper', 'crunchyroll.json');
  await fs.outputJson(outputFile, { headers }, { spaces: 2 });
}

async function updateHeaders() {
  // Anonymous auth
  let response = await fetch(apiAuth, {
    method: 'POST',
    headers: {
      'Authorization': authBasic,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': userAgent,
    },
    body: 'grant_type=client_id'
  })
    .then((res) => res.json());

  let expires_in = ((Date.now() / 1000) + response.expires_in) * 1000;

  const headers = {
    auth: `Bearer ${response.access_token}`,
    expires_in
  }
  saveHeaders(headers);
  await delay(500);
  return headers;
}

async function fetchCR(url) {
  let headers = await getHeaders();
  if (headers === undefined || headers.expires_in < Date.now()) {
    headers = await updateHeaders();
  }

  return fetch(url, {
    headers: { 'Authorization': headers.auth }
  });
}

async function getAllBangumi(page, total, lang) {
  const pageSize = 50;
  const spinner = ora(`Crawling page ${page}/${total || '?'}`).start();

  const data = await fetchCR(`${apiBrowse}?start=${(page - 1) * pageSize}&n=${pageSize}&locale=${lang}`).then((res) => res.json());
  spinner.stop();

  const totalPage = Math.ceil(data.total / pageSize);
  const items = data.data.map((title) => {
    return {
      id: title.id,
      title: title.title,
      url: title.media_type === 'movie' ? `https://www.crunchyroll.com/watch/${title.id}/` : null,
    };
  });
  if (page < totalPage) {
    await delay(500);
    return items.concat(await getAllBangumi(page + 1, totalPage, lang));
  }
  return items;
}

exports.getAll = async function getAll() {
  const jsonEN = await getAllBangumi(1, undefined, "en-US");
  const jsonTW = await getAllBangumi(1, undefined, "zh-TW");

  // titleList, format ['lang code', json]
  const titleList = [['en', jsonEN], ['zh-Hant', jsonTW]];

  // process all language and combine into 1 list
  let result = [];
  jsonEN.forEach((item) => { result.push(processItem(item, titleList)); });
  jsonTW.filter((item) => result.filter((i) => i.id === item.id).length === 0)
    .forEach((item) => { result.push(processItem(item, titleList)); });

  return result;
};;

function processItem(item, titleList) {
  let titleTranslate = {};
  titleList.forEach(([lang, titles]) => {
    const title = titles.find((i) => item.id == i.id);
    if (title) {
      if (titleTranslate[lang] && !titleTranslate[lang].includes(title.title)) {
        titleTranslate[lang].push(title.title);
      } else {
        titleTranslate[lang] = [title.title];
      }
    }
  });

  return {
    ...item,
    titleTranslate: titleTranslate,
  };
}

exports.getBegin = async function getBegin(id) {
  let url = apiSeasons.replace('{{id}}', id);
  const seriesId = await fetchCR(url)
      .then((res) => res.json())
      .then((data) => {
        return data.data[0].id;
      });
    if (seriesId === undefined) 
      return '';

  url = apiEpisodes.replace('{{id}}', seriesId);
  return await fetchCR(url)
      .then((res) => res.json())
      .then((data) => {
        return new Date(data.data[0].premium_available_date || data.data[0].episode_air_date).toISOString();
      });
};

exports.matchBangumi = async (input, items) => {
  // find japanese title with Tenrai API (MyAnimeList)
  for (const item of items) {
    const enTitle = item.titleTranslate["en"][0];
    const spinner = ora(`Find JP title for: ${enTitle}`).start();
    try {
      const jpTitle = await fetch(`https://api.tenrai.org/v1/anime?q=${enTitle}&limit=1`)
        .then((res) => res.json())
        .then((data) => {
          if (data.data) {
            for (const searchResult of data.data) {
              if (searchResult.title_english === enTitle || searchResult.title === enTitle) {
                return searchResult.title_japanese;
              }
            }
            return null;
          }
        });
      item.title = jpTitle;
    } catch (error) {
      console.error(` Error: ${error.message}`);
    }

    // Tenrai API Rate Limit: 120 request/minute
    // https://tenrai.org/status
    await delay(500);
    spinner.stop();
  }

  return matchBangumi(input, { items });
}

exports.getIsBangumiOffline = async (id) => {
  const seriesTotal = await fetchCR(`${apiCms}/series/${id}/`)
    .then((res) => res.json())
    .then((data) => data.total);
  if (seriesTotal > 0) {
    return false;
  }

  const moviesTotal = await fetchCR(`${apiCms}/movies/${id}/`)
    .then((res) => res.json())
    .then((data) => data.total);
  if (moviesTotal > 0) {
    return false;
  }

  return true;
}
