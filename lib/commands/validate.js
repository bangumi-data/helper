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
  return { onairSites };
}

/**
 * youtube域名站点的开播时间 *独自* 先行于默认时间，即有大概率为错误数据
 * @returns {Array} 被判定为可疑数据的站点
 */
function validateItemWithYoutubeBeforeDefault(item, { onairSites }) {
  const defaultBegin = item.begin;
  if (!defaultBegin) return [];
  const siteList = [];
  for (const { site, begin } of item.sites) {
    if (!begin || begin > defaultBegin) continue;
    siteList.push({ site, begin });
  }
  const grouped = groupBy(siteList, 'begin');
  const merged = lodashMap(grouped, (sites, begin) => ({
    sites: sites.map(site => site.site),
    begin,
  }));
  const needsReviewSites = [];
  const hostname = 'youtube';
  for (const { sites } of merged) {
    const needs = sites.reduce((acc, site) =>
      acc && onairSites[site].urlTemplate.includes(hostname, 10)
    , true);
    if (needs) {
      needsReviewSites.push(...sites); // youtube域名站点单独先行
    }
  }
  return needsReviewSites;
}

/**
 * 人工复查并编辑逆序遍历的可疑记录
 * @param {{ month, itemIndex, title, site }[]} records - 可疑记录
 */
async function manualReviewRecords(records, input, force) {
  const recordsLen = records.length;
  for (const [idx, { title, site, ...record }] of records.reverse().entries()) {
    console.log(`[${idx + 1}/${recordsLen}][${record.month}] ${title} `);
    await edit({
      input,
      ...record,
      siteList: [site],
      force
    });
  }
}

exports.validate = async function validate({ input, strategy, force }) {
  if (!strategiesMap.has(strategy)) {
    console.error('不具备所指定的策略');
    process.exit(1);
  }
  const needsReviewRecords = [];
  const spinner = ora(`Validating...`).start();
  const initialData = await strategiesMap.get(strategy).initial(input);
  const filePaths = await walk(input, (x) => /\d\d\.json$/.test(x));
  for (const filePath of filePaths) {
    const [, year, month] = /(\d{4})(?:\\|\/)(\d{2})\.json$/g.exec(filePath);
    const json = fs.readJsonSync(filePath);
    for (const [itemIndex, item] of json.entries()) {
      const needsReviewSites = await strategiesMap.get(strategy).validate(item, initialData);
      needsReviewSites.forEach((site) => {
        needsReviewRecords.push({
          month: year + month,
          itemIndex,
          title: item.title,
          site,
        });
      });
    }
  }
  spinner.succeed(`Find out ${needsReviewRecords.length} records need review...`);
  await strategiesMap.get(strategy).review(needsReviewRecords, input, force);
}