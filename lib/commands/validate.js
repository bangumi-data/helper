const path = require('path');
const fs = require('fs-extra');
const ora = require('ora');
const edit = require('./edit.js');
const { walk } = require('../utils.js');
const { tmdb_regex, getBeginById } = require('../crawlers/tmdb.js');
const dayjs = require('dayjs');

const strategiesMap = new Map([
  ['youtubeBeforeDefault', {
    validate: validateItemWithYoutubeBeforeDefault,
    review: manualReviewRecords,
  }],
  ['urlPunycode', {
    validate: validateUrlPunycode,
    review: logRecord,
  }],
  ['tmdb', {
    validate: validateTmdb,
    review: logRecord,
  }],
  ['tmdbBegin', {
    validate: validateTmdbBegin,
    review: logRecord,
  }],
]);

exports.strategies = Array.from(strategiesMap.keys());

function processMonth(year, month, filterFrom, filterTo) {
  if (filterFrom) {
    const fileMonth = dayjs(year + '-' + month + '-01');
    const monthFrom = dayjs(filterFrom.slice(0, 4) + '-' + filterFrom.slice(4, 6) + '-01');
    if (fileMonth.isBefore(monthFrom)) {
      return false;
    }
  }
  if (filterTo) {
    const fileMonth = dayjs(year + '-' + month + '-01');
    const monthTo = dayjs(filterTo.slice(0, 4) + '-' + filterTo.slice(4, 6) + '-01');
    if (fileMonth.isAfter(monthTo)) {
      return false;
    }
  }
  return true;
}

async function loadOnairSites(input) {
  const onairSitesJsonFile = path.join(
    path.dirname(input), 'sites', 'onair.json'
  );
  const onairSites = fs.existsSync(onairSitesJsonFile)
    ? await fs.readJson(onairSitesJsonFile)
    : undefined;
  if (!onairSites) {
    console.error('缺失指定文件', onairSitesJsonFile);
    process.exit(1);
  }
  const filteredSites = {};
  for (const [key, value] of Object.entries(onairSites))  {
    if (value.urlTemplate.includes('youtube', 10)) {
      filteredSites[key] = value;
    }
  }
  return { onairSites: filteredSites };
}

/**
 * youtube域名站点的开播时间 *独自* 先行于默认时间，即有大概率为错误数据
 * @returns {Array} 被判定为可疑数据的站点
 */
async function validateItemWithYoutubeBeforeDefault(input, spinner, monthFrom, monthTo) {
  const { onairSites } = await loadOnairSites(input);
  // get exclusions
  const api = `https://cdn.jsdelivr.net/gh/bangumi-data/helper@master/exclusions/validate/youtubeBeforeDefault.json`;
  const remote = await fetch(api).then((res) => (res.ok ? res.json() : {})).catch(() => ({}));
  const exclusionFile = path.resolve(__dirname, `../../exclusions/validate/youtubeBeforeDefault.json`);
  const local = await fs.readJSON(exclusionFile).catch(() => ({}));
  const exclusions = {};
  for (const key of Object.keys(onairSites)) {
    let tempArray = [];
    if (remote[key]) {
      tempArray = [ ...tempArray, ...remote[key] ];
    }
    if (local[key]) {
      tempArray = [ ...tempArray, ...local[key] ];
    }
    exclusions[key] = tempArray;
  }

  // validate
  const needsReviewRecords = [];
  const filePaths = await walk(input, (x) => /\d\d\.json$/.test(x));
  for (const filePath of filePaths) {
    const [, year, month] = /(\d{4})(?:\\|\/)(\d{2})\.json$/g.exec(filePath);
    if(!processMonth(year, month, monthFrom, monthTo)) continue;
    const json = fs.readJsonSync(filePath);
    for (const [itemIndex, item] of json.entries()) {
      const defaultBegin = item.begin;
      if (!defaultBegin) continue;
      for (const { site, id, begin } of item.sites) {
        if (!onairSites[site]) continue;
        if (exclusions[site].includes(id)) continue;
        if (!begin || begin >= defaultBegin) continue;
        needsReviewRecords.push({
            site, 
            id,
            begin,
            year,
            month,
            itemIndex,
            title: item.title,
        });
      }
    }
  }
  return needsReviewRecords;
}

/**
 * 找出网址使用百分号编码的番剧
 * @returns {Array} 百分号编码的番剧
 */
async function validateUrlPunycode(input, spinner, monthFrom, monthTo) {
  const needsReviewRecords = [];
  const filePaths = await walk(input, (x) => /\d\d\.json$/.test(x));
  for (const filePath of filePaths) {
    const [, year, month] = /(\d{4})(?:\\|\/)(\d{2})\.json$/g.exec(filePath);
    if(!processMonth(year, month, monthFrom, monthTo)) continue;
    const json = fs.readJsonSync(filePath);
    for (const [itemIndex, item] of json.entries()) {
      const regex = /(?:https?:\/\/)?([^\/]+)\.[a-z]{2,63}/;
      if (item.officialSite && (regex.test(item.officialSite))) {
        if (item.officialSite.match(regex)) {
          const domain = item.officialSite.match(regex)[1];
          if (domain.includes('%')) {
            needsReviewRecords.push({
                year,
                month,
                message: `Please check officialSite for ${item.title}`
            });
          }
        }
      }
    }
  }
  return needsReviewRecords;
}

/**
 * 验证格式
 * 找出番剧中重复的tmdb编号
 * 
 * @returns {Array} 错误信息
 */
async function validateTmdb(input, spinner, monthFrom, monthTo) {
  // get exclusions
  const api = `https://cdn.jsdelivr.net/gh/bangumi-data/helper@master/exclusions/validate/tmdb.txt`;
  const remote = await fetch(api).then((res) => (res.ok ? res.text() : '')).catch(() => '');
  const exclusionFile = path.resolve(__dirname, `../../exclusions/validate/tmdb.txt`);
  const local = await fs.readFile(exclusionFile).catch(() => '');
  const exclusions = [...new Set(`${remote}\n${local}`.trim().split(/\r?\n/))];
  
  // validate
  const needsReviewRecords = [];
  let idMap = new Map();
  const filePaths = await walk(input, (x) => /\d\d\.json$/.test(x));
  for (const filePath of filePaths) {
    const [, year, month] = /(\d{4})(?:\\|\/)(\d{2})\.json$/g.exec(filePath);
    if(!processMonth(year, month, monthFrom, monthTo)) continue;
    const json = fs.readJsonSync(filePath);
    for (const [itemIndex, item] of json.entries()) {
      const tmdbId = item.sites.find((s) => s.site === 'tmdb')?.id;
      if (tmdbId) {
        if (exclusions.includes(tmdbId)) {
          continue;
        }
        
        spinner.text = `Validating ${year}-${month} - ${item.title}...`;
        // check duplicate
        if (idMap.get(tmdbId)) {
          idMap.set(tmdbId, [...idMap.get(tmdbId), item.title]);
        } else {
          idMap.set(tmdbId, [item.title]);
        }

        // check format
        if (!tmdb_regex.test(tmdbId)) {
          needsReviewRecords.push({
              year,
              month,
              message: `Incorrect format: ${tmdbId}`
          });
          continue;
        }
      }
    }
  }
  for (const [tmdbId, bgmIds] of idMap) {
    if (bgmIds.length > 1) {
      needsReviewRecords.push({
          message: `duplicate tmdbId: ${tmdbId}`
      });
    }
  }
  return needsReviewRecords;
}


/**
 * 找出tmdb跟开播时间不同的番剧, 需人手判定tmdb数据是否有误
 * @returns {Array} 错误信息
 */
async function validateTmdbBegin(input, spinner, monthFrom, monthTo) {
  // get exclusions
  const api = `https://cdn.jsdelivr.net/gh/bangumi-data/helper@master/exclusions/validate/tmdb.txt`;
  const remote = await fetch(api).then((res) => (res.ok ? res.text() : '')).catch(() => '');
  const exclusionFile = path.resolve(__dirname, `../../exclusions/validate/tmdb.txt`);
  const local = await fs.readFile(exclusionFile).catch(() => '');
  const apiBegin = `https://cdn.jsdelivr.net/gh/bangumi-data/helper@master/exclusions/validate/tmdb_begin.txt`;
  const remoteBegin = await fetch(apiBegin).then((res) => (res.ok ? res.text() : '')).catch(() => '');
  const exclusionFileBegin = path.resolve(__dirname, `../../exclusions/validate/tmdb_begin.txt`);
  const localBegin = await fs.readFile(exclusionFileBegin).catch(() => '');
  const exclusions = [...new Set(`${remote}\n${local}\n${remoteBegin}\n${localBegin}`.trim().split(/\r?\n/))];
  
  // validate
  const needsReviewRecords = [];
  const filePaths = await walk(input, (x) => /\d\d\.json$/.test(x));
  for (const filePath of filePaths) {
    const [, year, month] = /(\d{4})(?:\\|\/)(\d{2})\.json$/g.exec(filePath);
    if(!processMonth(year, month, monthFrom, monthTo)) continue;
    const json = fs.readJsonSync(filePath);
    for (const [itemIndex, item] of json.entries()) {
      const tmdbId = item.sites.find((s) => s.site === 'tmdb')?.id;
      if (tmdbId) {
        if (exclusions.includes(tmdbId)) {
          continue;
        }
        
        spinner.text = `Validating ${year}-${month} - ${item.title}...`;
        try {
          const [tmdbYear, tmdbMonth, tmdbDate] = await getBeginById(tmdbId).then((date) => date.split('-'));
          // also accept month-1
          let tmdbYear2 = tmdbYear;
          let tmdbMonth2 = String(parseInt(tmdbMonth) - 1).padStart(2, '0');
          if(tmdbMonth2 === '00') {
            tmdbYear2 = String(parseInt(tmdbYear) - 1).padStart(2, '0');
            tmdbMonth2 = "12";
          }
          // also accept month+1
          let tmdbYear3 = tmdbYear;
          let tmdbMonth3 = String(parseInt(tmdbMonth) + 1).padStart(2, '0');
          if(tmdbMonth3 === '13') {
            tmdbYear3 = String(parseInt(tmdbYear) + 1).padStart(2, '0');
            tmdbMonth3 = "01";
          }
          if (!((tmdbYear === year && tmdbMonth === month) || (tmdbYear2 === year && tmdbMonth2 === month) || (tmdbYear3 === year && tmdbMonth3 === month))) {
            needsReviewRecords.push({
                message: `[${year}-${month}] ${tmdbId}\tBegin date does not match: ${tmdbYear}-${tmdbMonth}`
            });
          }
        } catch (error) {
          needsReviewRecords.push({
              year,
              month,
              message: `tmdbId: ${tmdbId}: ${error}`
          });
        }
      }
    }
  }
  return needsReviewRecords;
}

/**
 * 逆序遍历可疑记录，进行人工复查编辑，并将强制覆写
 * @param {{ month, itemIndex, title, site }[]} records - 可疑记录
 */
async function manualReviewRecords(records, input) {
  const recordsLen = records.length;
  for (const [idx, { title, site, ...record }] of records.reverse().entries()) {
    ora().info(`[${idx + 1}/${recordsLen}][${record.year}-${record.month}] ${title}`);
    await edit({
      input,
      month: `${record.year}${record.month}`,
      itemIndex: record.itemIndex,
      siteList: [site],
      force: true,
    });
  }
}

function logRecord(records) {
  for (const record of records) {
    let message = record.message;
    if (record.year !== undefined && record.month !== undefined) {
      message = `[${record.year}-${record.month}] ${message}`;
    }
    ora().info(message);
  }
}

exports.validate = async function validate({ input, strategy, month }) {
  if (!strategiesMap.has(strategy)) {
    console.error('不具备所指定的策略');
    process.exit(1);
  }
  if (month && !/^[\d\-]{6}(?:\-[\d\-]{6})?$/.test(month)) {
    console.error('Invalid month format');
    process.exit(1);
  }
  const spinner = ora(`Validating...`).start();

  let monthFrom = undefined;
  let monthTo = undefined;
  if (month) {
    if(month.includes('-')){
      monthFrom = month.split('-')[0];
      monthTo = month.split('-')[1];
    } else {
      monthFrom = month;
      monthTo = month;
    }
  }
  
  const needsReviewRecords = await strategiesMap.get(strategy).validate(input, spinner, monthFrom, monthTo);
  spinner.succeed(`Find out ${needsReviewRecords.length} records need review...`);
  await strategiesMap.get(strategy).review(needsReviewRecords, input);
} 