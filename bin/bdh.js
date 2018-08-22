#!/usr/bin/env node

const yargs = require('yargs');
const updateNotifier = require('update-notifier');
const pkg = require('../package.json');

updateNotifier({ pkg }).notify();

const create = require('../lib/commands/create.js');
const hokan = require('../lib/commands/hokan.js');
const update = require('../lib/commands/update.js');

const DEFAULT_DIR = './data/items';

// eslint-disable-next-line no-unused-vars
const { argv } = yargs
  .usage('Usage: bdh <command> [--focus|-f] [--input|-i ./data/items] [--output|-o ./data/items]')
  .command('create <season>', '生成某一季度的初始数据', {}, create)
  .example('bdh create 2016q4', '生成 2016 第四季度的数据')
  .command('update <month>', '更新某一月份的番组数据', {}, update)
  .example('bdh update 201610', '更新 2016 年 10 月的番剧数据')
  .command('hokan <site>', '补完某站的所有番剧数据', {}, hokan)
  .example('bdh hokan iqiyi', '补完 iqiyi 的所有番剧数据')
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
