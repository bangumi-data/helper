#!/usr/bin/env node

const yargs = require('yargs');
const updateNotifier = require('update-notifier');
const pkg = require('../package.json');

updateNotifier({ pkg }).notify();

const create = require('../lib/commands/create.js');
const end = require('../lib/commands/end.js');
const hokan = require('../lib/commands/hokan.js');
const update = require('../lib/commands/update.js');
const edit = require('../lib/commands/edit.js');
const add = require('../lib/commands/add.js');
const cleanup = require('../lib/commands/cleanup.js');

const DEFAULT_DIR = './data/items';

// eslint-disable-next-line no-unused-vars
const { argv } = yargs
  .usage('Usage: bdh <command> [--input|-i ./data/items] [--output|-o ./data/items]')
  .command('create <season>', '生成某季度的初始数据', {}, create)
  .example('bdh create 2016q4', '生成 2016 第四季度的数据')
  .command('update <month>', '更新某月的番组数据', {}, update)
  .example('bdh update 201610', '更新 2016 年 10 月的番剧数据')
  .command('edit <month>', '交互式地编辑某月的番剧数据', {}, edit)
  .example('bdh edit 201610', '交互式地 2016 年 10 月的番剧数据的放送站点')
  .command('add <bangumiId> [siteList..]', '根据bangumi添加番剧数据', {}, add)
  .example([
    ['bdh add 207195', '添加《ゆるキャン△》'],
    ['bdh add 207195 nicovideo:yurucamp', '添加《ゆるキャン△》, 并同时添加1个放送站点'],
    ['bdh add 207195 nicovideo:yurucamp gamer:89804', '添加《ゆるキャン△》, 并同时添加多个放送站点'],
  ])
  .command('hokan <site>', '补完某站的所有番剧数据', {}, hokan)
  .example('bdh hokan iqiyi', '补完 iqiyi 的所有番剧数据')
  .command('end', '补充所有 end 字段为空的番剧', {}, end)
  .example('bdh end', '补充所有 end 字段为空的番剧')
  .command('cleanup <site>', '清理已下架番剧', {}, cleanup)
  .example('bdh cleanup', '清理已下架番剧')
  .option('f', {
    alias: 'force',
    type: 'boolean',
    describe: '强制覆写已存在的数据',
    default: false,
    global: true,
  })
  .option('i', {
    alias: 'input',
    type: 'string',
    describe: '数据输入目录',
    default: DEFAULT_DIR,
    global: true,
  })
  .option('o', {
    alias: 'output',
    type: 'string',
    describe: '数据输出目录',
    default: DEFAULT_DIR,
    global: true,
  })
  .alias('h', 'help')
  .alias('v', 'version');
