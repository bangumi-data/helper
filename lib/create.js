const path = require('path');
const bangumi = require('./spider/bangumi.js');
const syoboi = require('./spider/syoboi.js');
const { delay, timeout, classify, readJSON, writeJSON, merge } = require('./utils.js');

module.exports = (argv) => {
  const { season, output, focus } = argv;
  return syoboi(season)
    .then(items =>
      items.reduce((sequence, item, idx) => sequence.then(() => {
        console.log(`[${idx + 1}/${items.length}][bangumi] ${item.title}`);
        return Promise.race([bangumi(item), timeout(10000)])
          .then((result) => {
            if (result && result.sites) {
              item.sites = item.sites.concat(result.sites);
              Object.assign(item.titleTranslate, result.titleTranslate);
            }
          })
          .catch(console.log)
          .then(() => delay(1000));
      }), Promise.resolve())
        .then(() => items)
    )
    .then(classify)
    .then((data) => {
      let sequence = Promise.resolve();
      for (const year in data) {
        for (const month in data[year]) {
          const jsonPath = path.resolve(output, `${year}/${month}.json`);
          sequence = sequence
            .then(() => readJSON(jsonPath))
            .then(items => merge(items, data[year][month], 'title', focus))
            .then(items => writeJSON(jsonPath, items))
            .catch(console.log);
        }
      }
      return sequence;
    })
    .catch(console.log);
};
