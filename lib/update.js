const { readJSON, writeJSON } = require('./utils.js');
const acfun = require('./spider/acfun.js');
const bilibili = require('./spider/bilibili.js');
const iqiyi = require('./spider/iqiyi.js');
const kankan = require('./spider/kankan.js');
const letv = require('./spider/letv.js');
const mgtv = require('./spider/mgtv.js');
const pptv = require('./spider/pptv.js');
const qq = require('./spider/qq.js');
const sohu = require('./spider/sohu.js');
const tudou = require('./spider/tudou.js');
const youku = require('./spider/youku.js');

const spider = { acfun, bilibili, iqiyi, kankan, letv, mgtv, pptv, qq, sohu, tudou, youku };

const DEFAULT_SITE = {
  site: '',
  id: '',
  begin: '',
  official: true,
  premuiumOnly: false,
  censored: false,
  lang: 'zh-Hans',
  comment: '',
};

module.exports = (path, focus) =>
  readJSON(path)
    .then(items =>
      items.reduce((seq1, item) => seq1.then(() =>
        item.sites.reduce((seq2, site) => seq2.then(() => {
          if (!spider[site.site]) {
            return Promise.resolve();
          }
          console.log(item.title, site.site);
          return spider[site.site](site.id)
            .then((info) => {
              const base = { site: site.site, id: site.id };
              const origin = Object.assign({}, site);
              if (origin.begin === '') {
                Reflect.deleteProperty(origin, 'begin');
              }
              const result = focus
                ? Object.assign({}, DEFAULT_SITE, origin, info, base)
                : Object.assign({}, DEFAULT_SITE, info, origin, base);
              Object.assign(site, result);
            });
        }), Promise.resolve())
          .then(() => item)
      ), Promise.resolve())
        .then(() => items)
    )
    .then(items => writeJSON(path, items))
    .catch(console.log);
