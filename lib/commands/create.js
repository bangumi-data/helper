const path = require('path');
const fs = require('fs-extra');
const ora = require('ora');

const crawler = require('../crawlers/index.js');
const { delay, timeout, classify, merge } = require('../utils.js');

module.exports = async function create({ season, output }) {
  const items = await crawler.syoboi.getSeason(season);
  await items.reduce((sequence, item, idx) => sequence.then(async () => {
    const spinner = ora(`[bangumi][${idx + 1}/${items.length}]Fetching: ${item.title}`).start();
    try {
      const result = await Promise.race([crawler.bangumi.getMeta(item), timeout(10000)]);
      if (result && result.sites) {
        item.sites.push(...result.sites);
        Object.assign(item.titleTranslate, result.titleTranslate);
        Object.assign(item, { type: result.type });
      }
    } catch (err) {
      spinner.fail(err);
    }
    await delay(1000);
    spinner.stop();
  }), Promise.resolve());
  const data = classify(items);
  let sequence = Promise.resolve();
  for (const year in data) {
    for (const month in data[year]) {
      const jsonFile = path.resolve(output, `${year}/${month}.json`);
      sequence = sequence
        .then(() => fs.readJson(jsonFile))
        .catch(() => [])
        .then(origin => merge(origin, data[year][month], 'title'))
        .then(merged => fs.outputJson(jsonFile, merged, { spaces: 2 }))
        .then(() => console.log(`Data is outputed to ${jsonFile}`))
        .catch(console.error);
    }
  }
  return sequence;
};
