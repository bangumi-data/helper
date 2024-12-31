const fs = require('fs-extra');
const path = require('path');
const ora = require('ora');
const { matchBangumi } = require('../utils.js');
const { homedir } = require('os');

const apiAuth = 'https://www.crunchyroll.com/auth/v1/token';
const apiBeta = 'https://beta-api.crunchyroll.com';
const apiBrowse = `${apiBeta}/content/v2/discover/browse`;
const apiCms = `${apiBeta}/content/v2/cms`;
const apiSeasons = `${apiBeta}/content/v2/cms/series/{{id}}/seasons`;
const apiEpisodes = `${apiBeta}/content/v2/cms/seasons/{{id}}/episodes`;
const authBasic = "Basic bm9haWhkZXZtXzZpeWcwYThsMHE6";

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
  await new Promise(resolve => setTimeout(resolve, 500));
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

async function getAllBangumi(page, total) {
  const pageSize = 36;
  const spinner = ora(`Crawling page ${page}/${total || '?'}`).start();

  const data = await fetchCR(`${apiBrowse}?start=${(page - 1) * pageSize}&n=${pageSize}`)
    .then((res) => res.json());
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
    return items.concat(await getAllBangumi(page + 1, totalPage));
  }
  return items;
}

exports.getAll = async function getAll() {
  return getAllBangumi(1);
};

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
        return new Date(data.data[0].episode_air_date).toISOString();
      });
};

exports.matchBangumi = async (input, items) => {
  // find japanese title with Jikan API (MyAnimeList)
  for (const item of items) {
    const enTitle = item.title;
    item.titleTranslate = {
      'en': [enTitle],
    }
    const spinner = ora(`Find JP title for: ${enTitle}`).start();
    const jpTitle = await fetch(`https://api.jikan.moe/v4/anime?q=${enTitle}`)
      .then((res) => res.json())
      .then((data) => {
        if(data.data) {
          for (const searchResult of data.data) {
            if (searchResult.title_english === enTitle || searchResult.title === enTitle) {
              return searchResult.title_japanese;
            }
          }
          return null;
        }
      });
    item.title = jpTitle;

    // Jikan API Rate Limit: 60 request/minute
    await new Promise(resolve => setTimeout(resolve, 1000));
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
