#!/usr/bin/env node

const updateNotifier = require('update-notifier');
const pkg = require('../package.json');

updateNotifier({ pkg }).notify();

const yargs = require('yargs');
const create = require('../lib/create.js');
const update = require('../lib/update.js');

const DEFAULT_DIR = './data/items';
const { argv } = yargs
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
  .alias('v', 'version');

if (argv._[0] === 'create') {
  create(argv)
    .catch(console.log)
    .then(() => process.exit());
}
if (argv._[0] === 'update') {
  update(argv)
    .catch(console.log)
    .then(() => process.exit());
}
