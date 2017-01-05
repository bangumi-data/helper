#!/usr/bin/env node

const path = require('path');
const yargs = require('yargs');
const create = require('../lib/create.js');
const update = require('../lib/update.js');
const { merge, readJSON, writeJSON, classify } = require('../lib/utils.js');

const DEFAULT_DIR = './data/items';
const argv = yargs
  .usage('Usage: bdh <command> [--focus|-f] [--input|-i ./data/items] [--output|-o ./data/items]')
  .command('create <season>', '生成某一季度的初始数据')
  .example('bdh create 2016q4', '生成 2016 第四季度的数据')
  .command('update <month>', '更新某一月份的番组数据')
  .example('bdh update 201610', '更新 2016 年 10 月的番剧数据')
  .alias('f', 'focus')
  .describe('f', '强制覆写已存在的数据')
  .default('f', false)
  .global('f')
  .alias('i', 'input')
  .describe('i', '数据输入目录')
  .default('i', DEFAULT_DIR)
  .global('i')
  .alias('o', 'output')
  .describe('o', '数据输出目录')
  .default('o', DEFAULT_DIR)
  .global('o')
  .alias('h', 'help')
  .help()
  .alias('v', 'version')
  .version()
  .argv;

if (argv._[0] === 'create') {
  create(argv.season)
    .then(classify)
    .then((data) => {
      let sequence = Promise.resolve();
      for (const year in data) {
        for (const month in data[year]) {
          const jsonPath = path.resolve(argv.output, `${year}/${month}.json`);
          sequence = sequence
            .then(() => readJSON(jsonPath))
            .then(items => merge(items, data[year][month], 'title', argv.focus))
            .then(items => writeJSON(jsonPath, items))
            .catch(console.log);
        }
      }
      return sequence;
    })
    .catch(console.log)
    .then(() => process.exit());
}
if (argv._[0] === 'update') {
  const jsonPath = path.resolve(argv.input,
    String(argv.month).replace(/(\d{4})(\d\d)/, '$1/$2.json'));
  update(jsonPath, argv.focus)
    .catch(console.log)
    .then(() => process.exit());
}
