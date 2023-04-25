const path = require('path');
const fs = require('fs-extra');
const ora = require('ora');

const crawler = require('../crawlers/index.js');
const { fetch, walk } = require('../utils.js');

async function getExclusions(site) {
  const spinner = ora('Filtering exclusions').start();
  const api = `https://cdn.jsdelivr.net/gh/bangumi-data/helper@master/exclusions/${site}.txt`;
  const remote = await fetch(api).then((res) => (res.ok ? res.text() : '')).catch(() => '');
  const exclusionFile = path.resolve(__dirname, `../../exclusions/${site}.txt`);
  const local = await fs.readFile(exclusionFile).catch(() => '');
  spinner.stop();
  return [...new Set(`${remote}\n${local}`.trim().split(/\r?\n/))];
}

async function getExistences(input, site) {
  const spinner = ora('Filtering existences').start();
  const files = await walk(input, (item) => /\d\d\.json$/.test(item));
  const items = await Promise.all(files.map((file) => fs.readJson(file)))
    .then((results) => [].concat(...results));
  spinner.stop();
  return [].concat(...items.map((item) => item.sites))
    .filter((x) => typeof x === 'object')
    .filter((x) => x.site === site)
    .map((x) => x.id);
}

module.exports = async function hokan({ site, input, output }) {
  if (!crawler[site] || !crawler[site].getAll) {
    throw new Error(`${site} is not supported now.`);
  }
  const items = await crawler[site].getAll();
  console.log(`Total: ${items.length} items`);
  const exclusions = await getExclusions(site);
  const existences = await getExistences(input, site);
  let todos = items
    .filter((item) => !exclusions.includes(item.id))
    .filter((item) => !existences.includes(item.id))
    .map((item) => ({ site, ...item }));
  console.log(`After filtering: ${todos.length} items`);
  if(crawler[site].matchBangumi){
    todos = await crawler[site].matchBangumi(input, todos);
    console.log(`After matching: ${todos.length} items`);
  }
  if (!todos.length) {
    console.log('There is no bangumi needs hokan');
    return;
  }
  const outputFile = path.resolve(output, `0000/${site}.json`);
  await fs.outputJson(outputFile, todos, { spaces: 2 });
  console.log(`Data is outputed to ${outputFile}`);
};
