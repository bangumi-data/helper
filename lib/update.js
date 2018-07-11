const path = require('path');
const fs = require('fs-extra');
const ora = require('ora');
const fetch = require('node-fetch');

const { DEFAULT_INFO } = require('./utils.js');

const acfun = require('./spider/acfun.js');
const bilibili = require('./spider/bilibili.js');
const iqiyi = require('./spider/iqiyi.js');
const kankan = require('./spider/kankan.js');
const letv = require('./spider/letv.js');
const mgtv = require('./spider/mgtv.js');
const netflix = require('./spider/netflix.js');
const nicovideo = require('./spider/nicovideo.js');
const pptv = require('./spider/pptv.js');
const qq = require('./spider/qq.js');
const sohu = require('./spider/sohu.js');
const youku = require('./spider/youku.js');

// eslint-disable-next-line
const spider = { acfun, bilibili, iqiyi, kankan, letv, mgtv, netflix, nicovideo, pptv, qq, sohu, youku };
const siteRegex = {
  bangumi: /(?:bgm\.tv|bangumi\.tv|chii\.in)\/subject\/(\d+)/,

  acfun: /acfun\.cn\/v\/ab(\d+)/,
  bilibili: /bilibili\.com(?:\/anime\/(\d+)|\/bangumi\/media\/md(\d+))/,
  iqiyi: /www\.iqiyi\.com\/(a_\w+)\.html/,
  kankan: /movie\.kankan\.com\/movie\/(\d+)/,
  letv: /www\.le\.com\/comic\/(\d+)\.html/,
  mgtv: /www\.mgtv\.com\/h\/(\d+)\.html/,
  netflix: /netflix\.com\/.*title\/(\d+)/,
  nicovideo: /ch\.nicovideo\.jp\/([-\w]+)/,
  pptv: /v\.pptv\.com\/page\/(\w+)\.html/,
  qq: /v\.qq\.com\/detail\/(\w\/\w{15})\.html/,
  sohu: /tv\.sohu\.com\/(s\d{4}\/\w+)\/?/,
  youku: /list\.youku\.com\/show\/id_z(\w{20})\.html/,
};

// shortCircuitWhenNull
function scwn(obj1, obj2, key) {
  return obj1[key] === null ? obj2[key] : obj1[key];
}

function getBilibiliSeasonIdFromMediaId(mediaId) {
  const api = `https://bangumi.bilibili.com/view/web_api/media?media_id=${mediaId}`;
  return fetch(api)
    .then(res => res.json())
    .then(json => String(json.result.param.season_id));
}

async function normalizeSites(sites) {
  const result = [];
  for (let i = 0; i < sites.length; i++) {
    let site = sites[i];
    if (typeof site === 'string') {
      const name = Object.keys(siteRegex).find(key => siteRegex[key].test(site));
      if (name) {
        const [, id, id2] = site.match(siteRegex[name]);
        try {
          site = {
            site: name,
            id: name === 'bilibili' && id2
            // eslint-disable-next-line no-await-in-loop
              ? await getBilibiliSeasonIdFromMediaId(id2)
              : id,
          };
        } catch (e) {
          // noop
        }
      }
    }
    result.push(site);
  }
  return result;
}

module.exports = ({ input, month, focus }) => {
  const spinner = ora().start();
  const jsonPath = path.resolve(input, String(month).replace(/(\d{4})(\d\d)/, '$1/$2.json'));
  return fs.readJson(jsonPath)
    .then(items => (
      items.reduce((seq1, item, idx) => seq1.then(async () => {
        item.sites = await normalizeSites(item.sites);
        return item.sites.reduce((seq2, site) => seq2.then(() => {
          if (!spider[site.site] || !site.id) {
            return Promise.resolve();
          }
          spinner.text = `[${site.site}][${idx + 1}/${items.length}] ${item.title}`;
          return spider[site.site](site.id)
            .then((info) => {
              const origin = Object.assign({}, DEFAULT_INFO, site);
              const source = Object.assign({}, DEFAULT_INFO, info);
              const result = focus
                ? {
                  site: site.site,
                  id: site.id,
                  begin: source.begin || origin.begin,
                  official: scwn(source, origin, 'official'),
                  premuiumOnly: scwn(source, origin, 'premuiumOnly'),
                  censored: scwn(source, origin, 'censored'),
                  exist: scwn(source, origin, 'exist'),
                  comment: source.comment || origin.comment,
                }
                : {
                  site: site.site,
                  id: site.id,
                  begin: origin.begin || source.begin,
                  official: scwn(origin, source, 'official'),
                  premuiumOnly: scwn(origin, source, 'premuiumOnly'),
                  censored: scwn(origin, source, 'censored'),
                  exist: scwn(origin, source, 'exist'),
                  comment: origin.comment || source.comment,
                };
              Object.keys(DEFAULT_INFO).map(key => Reflect.deleteProperty(site, key));
              Object.assign(site, result);
            });
        }), Promise.resolve())
          .then(() => item);
      }), Promise.resolve())
        .then(() => items)
    ))
    .then(items => fs.outputJson(jsonPath, items, { spaces: 2 }))
    .then(() => { spinner.succeed('done'); })
    .catch(console.error);
};
