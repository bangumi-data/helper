const fs = require('fs-extra');
const path = require('path');
const cheerio = require('cheerio');
const ora = require('ora');
const { fetch } = require('../utils.js');
const { homedir } = require('os');
// use puppeteer to bypass cloudflare captcha
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

async function getHeaders() {
  const dictFile = path.resolve(homedir(), '.config', 'bangumi-helper', 'gamer.json');
  const local = await fs.readJSON(dictFile).catch(() => ({}));
  return local.headers;
}

async function saveHeaders(headers) {
  const outputFile = path.resolve(homedir(), '.config', 'bangumi-helper', 'gamer.json');
  await fs.outputJson(outputFile, { headers }, { spaces: 2 });
}

// 尝试自动通过人机认证, 如果失败请手动认证
async function updateHeaders() {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  await page.goto("https://ani.gamer.com.tw/");
  await page.setViewport({ width: 800, height: 600 });

  await page.waitForSelector('.animate-theme-list');

  // save cloudflare captcha cookie
  const userAgent = await browser.userAgent();
  const cookies = await page.cookies();
  const cf_clearance = cookies.find(cookie => cookie.name === 'cf_clearance');

  await browser.close();

  const headers = {
    'Cookie': `cf_clearance=${cf_clearance.value}`,
    'User-Agent': userAgent
  }
  saveHeaders(headers);
  await new Promise(resolve => setTimeout(resolve, 500));
  return headers;
}

async function getAllBangumi(page, totalPage) {
  const spinner = ora(`Crawling page ${page}/${totalPage || '?'}`).start();
  const headers = await getHeaders();
  const $ = await fetch(`https://ani.gamer.com.tw/animeList.php?page=${page}c=All&sort=1`, { headers: headers })
    .then((res) => res.text())
    .then(cheerio.load);
  spinner.stop();

  // check if blocked by captcha
  if ($('.captcha').length > 0) {
    await updateHeaders();
    return getAllBangumi(page, totalPage);
  }

  const items = $('.animate-theme-list > .theme-list-block > a')
    .map((i, el) => {
      const favouriteButtonJs = $(el).find('.btn-favorite').attr('onclick');
      const id = /toggleGather\((\d+),.*\)/.exec(favouriteButtonJs)[1];

      const title = $(el).find('.theme-name').text();
      const img = $(el).find('.theme-img').attr('data-src');
      return { id, titleTranslate: { 'zh-Hant': [title] }, img };
    })
    .get();

  totalPage = totalPage || $('.page_control > .page_number > a:last').text();
  if (page < totalPage) {
    return items.concat(await getAllBangumi(page + 1, totalPage));
  }
  return items;
}

exports.getAll = async function getAll() {
  return getAllBangumi(1);
};


async function _getFirstEpId(id) {
  const api = `https://acg.gamer.com.tw/acgDetail.php?s=${id}`;
  const $ = await fetch(api)
    .then((res) => res.text())
    .then(cheerio.load);
  const href = $('.seasonACG>ul>li>a:first').attr('href');
  return /animeVideo.php\?sn=(\d+)/.exec(href)[1];
}

async function _getBegin(id) {
  const headers = await getHeaders();
  const $ = await fetch(`https://ani.gamer.com.tw/animeVideo.php?sn=${id}`, { headers: headers })
    .then((res) => res.text())
    .then(cheerio.load);

  // check if blocked by captcha
  if ($('.captcha').length > 0) {
    await updateHeaders();
    return _getBegin(id);
  }

  const found = /上架時間：(.+)/.exec($('.anime_info_detail').text());
  return found ? new Date(`${found[1]}:00 GMT+0800`).toISOString() : '';
}

exports.getBegin = async function getBegin(id) {
  const firstEpId = await _getFirstEpId(id);
  const begin = await _getBegin(firstEpId);
  return begin;
};

