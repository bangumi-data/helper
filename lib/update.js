const path = require('path');
const { readJSON, writeJSON } = require('./utils.js');
const acfun = require('./spider/acfun.js');
const bilibili = require('./spider/bilibili.js');
const iqiyi = require('./spider/iqiyi.js');
const kankan = require('./spider/kankan.js');
const letv = require('./spider/letv.js');
const mgtv = require('./spider/mgtv.js');
const nicovideo = require('./spider/nicovideo.js');
const pptv = require('./spider/pptv.js');
const qq = require('./spider/qq.js');
const sohu = require('./spider/sohu.js');
const youku = require('./spider/youku.js');

// eslint-disable-next-line max-len
const spider = { acfun, bilibili, iqiyi, kankan, letv, mgtv, nicovideo, pptv, qq, sohu, youku };
module.exports = (argv) => {
  const { input, month, focus } = argv;
  const jsonPath = path.resolve(input, String(month).replace(/(\d{4})(\d\d)/, '$1/$2.json'));
  return readJSON(jsonPath)
    .then(items =>
      items.reduce((seq1, item) => seq1.then(() =>
        item.sites.reduce((seq2, site) => seq2.then(() => {
          if (!spider[site.site] || !site.id) {
            return Promise.resolve();
          }
          console.log(`[${site.site}] ${item.title}`);
          return spider[site.site](site.id)
            .then((info) => {
              const base = { site: site.site, id: site.id };
              const origin = Object.assign({}, site);
              if (origin.begin === '') {
                Reflect.deleteProperty(origin, 'begin');
              }
              const result = focus
                ? Object.assign({}, origin, info, base)
                : Object.assign({}, info, origin, base);
              Object.assign(site, result);
            });
        }), Promise.resolve())
          .then(() => item)
      ), Promise.resolve())
        .then(() => items)
    )
    .then(items => writeJSON(jsonPath, items))
    .catch(console.log);
};
