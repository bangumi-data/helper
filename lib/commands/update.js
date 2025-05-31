const path = require('path');
const fs = require('fs-extra');
const ora = require('ora');

const crawler = require('../crawlers/index.js');

const siteRegex = {
  bangumi: /(?:bgm\.tv|bangumi\.tv|chii\.in)\/subject\/(\d+)/,

  acfun: /acfun\.cn\/bangumi\/aa(\d+)/,
  bilibili: /bilibili\.com\/bangumi\/media\/md(\d+)/,
  iqiyi: /www\.iqiyi\.com\/(a_\w+)\.html/,
  letv: /www\.le\.com\/comic\/(\d+)\.html/,
  mgtv: /www\.mgtv\.com\/h\/(\d+)\.html/,
  netflix: /netflix\.com\/.*title\/(\d+)/,
  nicovideo: /ch\.nicovideo\.jp\/([-\w]+)/,
  qq: /v\.qq\.com\/detail\/(\w\/\w{15})\.html/,
  youku: /list\.youku\.com\/show\/id_z(\w{20})\.html/,
};

function normalizeSites(sites) {
  const result = [];
  for (let i = 0; i < sites.length; i++) {
    let site = sites[i];
    if (typeof site === 'string') {
      const name = Object.keys(siteRegex).find((key) => siteRegex[key].test(site));
      if (name) {
        site = { site: name, id: site.match(siteRegex[name])[1] };
      }
    }
    result.push(site);
  }
  return result;
}

module.exports = async function update({ input, month, force, siteList }) {
  const spinner = ora().start();
  const siteReg = new RegExp(`^(${siteList.join('|').replaceAll('*', '.*')})$`);
  const jsonFile = path.resolve(input, String(month).replace(/(\d{4})(\d\d)/, '$1/$2.json'));
  const items = await fs.readJson(jsonFile);
  const newItems = await items.reduce(async (seqItems, item, idx) => {
    const resultItems = await seqItems;
    const sites = await normalizeSites(item.sites).reduce(async (seqSites, site) => {
      const resultSites = await seqSites;
      if (
        (siteList.length > 0 && !siteReg.test(site.site))
        || !crawler[site.site] || !crawler[site.site].getBegin || !site.id
      ) {
        return resultSites.concat(site);
      }
      spinner.text = `[${idx + 1}/${items.length}]Fetching ${site.site}: ${item.title}`;
      const begin = await crawler[site.site].getBegin(site.id, site.site).catch(() => '');
      const broadcast = begin ? `R/${begin}/P7D` : '';
      return resultSites.concat({
        site: site.site,
        id: site.id,
        ...(site.url && { url: site.url }),
        begin: force ? (begin || site.begin) : (site.begin || begin),
        broadcast: force ? (broadcast || site.broadcast) : (site.broadcast || broadcast),
        ...(site.comment && { comment: site.comment }),
      });
    }, Promise.resolve([]));
    return resultItems.concat({ ...item, sites });
  }, Promise.resolve([]));
  await fs.outputJson(jsonFile, newItems, { spaces: 2 });
  spinner.stop();
  console.log(`Data is outputed to ${jsonFile}`);
};
