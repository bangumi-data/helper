#!/usr/bin/env node

const path = require('path');
const yargs = require('yargs');
const create = require('../lib/create.js');
const { merge, readJSON, writeJSON, classify } = require('../lib/utils.js');

const DEFAULT_DIR = './data/items';
const argv = yargs
  .usage('Usage: bdh <command> [--focus|-f] [--output|-o ./data/items]')
  .command('create <season>', '生成某一季度的初始数据')
  .example('bdh create 2016q4', '生成 2016 第三季度的数据')
  // .command('update <id>', '更新指定番组的数据（ID 为 Bangumi ID）')
  // .example('bdh update 140001', '更新 Bangumi ID 为 140001 番剧的数据')
  .alias('f', 'focus')
  .describe('f', '强制覆写已存在的数据')
  .default('f', false)
  .global('f')
  .alias('i', 'iutput')
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
    .then(data => {
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
