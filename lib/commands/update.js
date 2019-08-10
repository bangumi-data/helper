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
  pptv: /v\.pptv\.com\/page\/(\w+)\.html/,
  qq: /v\.qq\.com\/detail\/(\w\/\w{15})\.html/,
  sohu: /tv\.sohu\.com\/(s\d{4}\/\w+)\/?/,
  youku: /list\.youku\.com\/show\/id_z(\w{20})\.html/,
};

function normalizeSites(sites) {
  const result = [];
  for (let i = 0; i < sites.length; i++) {
    let site = sites[i];
    if (typeof site === 'string') {
      const name = Object.keys(siteRegex).find(key => siteRegex[key].test(site));
      if (name) {
        site = { site: name, id: site.match(siteRegex[name])[1] };
      }
    }
    result.push(site);
  }
  return result;
}

module.exports = async function update({ input, month, force }) {
  const spinner = ora().start();
  const jsonFile = path.resolve(input, String(month).replace(/(\d{4})(\d\d)/, '$1/$2.json'));
  const items = await fs.readJson(jsonFile);
  await items.reduce((seq1, item, idx) => seq1.then(async () => {
    item.sites = normalizeSites(item.sites);
    await item.sites.reduce((seq2, site) => seq2.then(async () => {
      if (!crawler[site.site] || !crawler[site.site].getBegin || !site.id) {
        return;
      }
      spinner.text = `[${idx + 1}/${items.length}]Fetching ${site.site}: ${item.title}`;
      const begin = await crawler[site.site].getBegin(site.id).catch(() => '');
      const info = {
        site: site.site,
        id: site.id,
        begin: force ? (begin || site.begin) : (site.begin || begin),
      };
      Object.assign(site, info);
    }), Promise.resolve());
  }), Promise.resolve());
  await fs.outputJson(jsonFile, items, { spaces: 2 });
  spinner.stop();
  console.log(`Data is outputed to ${jsonFile}`);
};
