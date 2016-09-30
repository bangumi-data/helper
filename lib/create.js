const bangumi = require('./spider/bangumi.js');
const syoboi = require('./spider/syoboi.js');
const { delay, timeout } = require('./utils.js');

module.exports = function(season) {
  return syoboi(season)
    .then(items =>
      items.reduce((sequence, item, idx) => sequence.then(() => {
        console.log(`[${idx + 1}/${items.length}][bangumi] ${item.title}`);
        return Promise.race([bangumi(item), timeout(10000)])
          .then(result => {
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
    .catch(console.log);
};
