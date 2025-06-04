const path = require('path');
const fs = require('fs-extra');
const ora = require('ora');
const { groupBy, map: lodashMap } = require('lodash');
const edit = require('./edit.js');
const { walk } = require('../utils.js');

const strategiesMap = new Map([
  ['youtubeBeforeDefault', {
    initial: loadOnairSites,
    validate: validateItemWithYoutubeBeforeDefault,
    review: manualReviewRecords,
  }],
]);

exports.strategies = Array.from(strategiesMap.keys());

async function getExclusions(strategie, { onairSites }) {
  const spinner = ora('Filtering exclusions').start();
  const api = `https://cdn.jsdelivr.net/gh/bangumi-data/helper@master/exclusions/validate/${strategie}.json`;
  const remote = await fetch(api).then((res) => (res.ok ? res.json() : {})).catch(() => ({}));
  const exclusionFile = path.resolve(__dirname, `../../exclusions/validate/${strategie}.json`);
  const local = await fs.readJSON(exclusionFile).catch(() => ({}));
  spinner.stop();
  const combinedSites = {};
  for (const key of Object.keys(onairSites)) {
    let tempArray = [];
    if (remote[key]) {
      tempArray = [ ...tempArray, ...remote[key] ];
    }
    if (local[key]) {
      tempArray = [ ...tempArray, ...local[key] ];
    }
    combinedSites[key] = tempArray;
  }
  return combinedSites;
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
function validateItemWithYoutubeBeforeDefault(item, { onairSites }) {
  const defaultBegin = item.begin;
  if (!defaultBegin) return [];
  const siteList = [];
  for (const { site, id, begin } of item.sites) {
    if (!onairSites[site]) continue;
    if (!begin || begin >= defaultBegin) continue;
    siteList.push({ site, id, begin });
  }
  return siteList;
}

/**
 * 逆序遍历可疑记录，进行人工复查编辑，并将强制覆写
 * @param {{ month, itemIndex, title, site }[]} records - 可疑记录
 */
async function manualReviewRecords(records, input) {
  const recordsLen = records.length;
  for (const [idx, { title, site, ...record }] of records.reverse().entries()) {
    console.log(`[${idx + 1}/${recordsLen}][${record.month}] ${title} `);
    await edit({
      input,
      ...record,
      siteList: [site],
      force: true,
    });
  }
}

exports.validate = async function validate({ input, strategy }) {
  if (!strategiesMap.has(strategy)) {
    console.error('不具备所指定的策略');
    process.exit(1);
  }
  const needsReviewRecords = [];
  const spinner = ora(`Validating...`).start();
  const initialData = await strategiesMap.get(strategy).initial(input);
  const exclusions = await getExclusions(strategy, initialData);
  const filePaths = await walk(input, (x) => /\d\d\.json$/.test(x));
  for (const filePath of filePaths) {
    const [, year, month] = /(\d{4})(?:\\|\/)(\d{2})\.json$/g.exec(filePath);
    const json = fs.readJsonSync(filePath);
    for (const [itemIndex, item] of json.entries()) {
      const needsReviewSites = await strategiesMap.get(strategy).validate(item, initialData);
      needsReviewSites.filter((site) => !exclusions[site.site].includes(site.id))
      .forEach((site) => {
        needsReviewRecords.push({
          month: year + month,
          itemIndex,
          title: item.title,
          site: site.site,
        });
      });
    }
  }
  spinner.succeed(`Find out ${needsReviewRecords.length} records need review...`);
  await strategiesMap.get(strategy).review(needsReviewRecords, input);
}