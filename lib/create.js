// const bangumi = require('./spider/bangumi.js');
const syoboi = require('./spider/syoboi.js');

module.exports = function(season) {
  return syoboi(season)
    // .then(items => {
    //   items.reduce((sequence, item) => sequence.then(() => {
    //     return bangumi(item)
    //       .then(result => {
    //         if (result) {
    //           item.sites = item.sites.concat(result.sites);
    //           Object.assign(item.titleTranslate, result.titleTranslate);
    //         }
    //       })
    //   }), Promise.resolve())
    // })
    .catch(console.log);
};
