const path = require('path');
const fs = require('fs-extra');
const ora = require('ora');

const bangumi = require('./spider/bangumi.js');
const syoboi = require('./spider/syoboi.js');
const { delay, timeout, classify, merge } = require('./utils.js');

module.exports = ({ season, output, focus }) => {
  const spinner = ora().start();
  return syoboi(season)
    .then(items => (
      items.reduce((sequence, item, idx) => sequence.then(() => {
        spinner.text = `[bangumi][fetching][${idx + 1}/${items.length}] ${item.title}`;
        return Promise.race([bangumi(item), timeout(10000)])
          .then((result) => {
            if (result && result.sites) {
              item.sites = item.sites.concat(result.sites);
              Object.assign(item.titleTranslate, result.titleTranslate);
            }
          })
          .catch((err) => { spinner.fail(); console.error(err); })
          .then(() => delay(1000));
      }), Promise.resolve())
        .then(() => { spinner.succeed(); return items; })
    ))
    .then(classify)
    .then((data) => {
      let sequence = Promise.resolve();
      for (const year in data) {
        for (const month in data[year]) {
          const jsonPath = path.resolve(output, `${year}/${month}.json`);
          sequence = sequence
            .then(() => fs.readJson(jsonPath))
            .catch(() => [])
            .then(items => merge(items, data[year][month], 'title', focus))
            .then(items => fs.outputJson(jsonPath, items, { spaces: 2 }))
            .catch(console.error);
        }
      }
      return sequence;
    })
    .then(() => { spinner.succeed('done'); })
    .catch(console.error);
};
