const inquirer = require('inquirer');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const quarterOfYear = require('dayjs/plugin/quarterOfYear');
const dayjs = require('dayjs');
const fuzzy = require('fuzzy');

inquirer.registerPrompt('autocomplete', require('inquirer-autocomplete-prompt'));

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(quarterOfYear);

const cycleList = {
  一次性: 'P0D',
  周播: 'P7D',
  日播: 'P1D',
  月播: 'P1M',
};

const siteList = [
  'acfun',
  'bilibili',
  'bilibili_hk_mo_tw',
  'sohu',
  'youku',
  'qq',
  'iqiyi',
  'letv',
  'pptv',
  'mgtv',
  'nicovideo',
  'netflix',
  'gamer',
  'muse_hk',
  'ani_one',
  'ani_one_asia',
  'viu',
  'mytv',
];

exports.add = async function add() {
  const defaultTime = dayjs().startOf('quarter').format('YYYYMMDDHHmmss');
  const getTime = (input = '', value = '') => {
    const start = `${input}`.slice(0, 14);
    const base = value !== '' ? getTime(`${value}`).plainTime : defaultTime;
    const end = base.slice(start.length, 14);
    return {
      colorTime: `${start}\x1b[2m${end}\x1b[0m`,
      plainTime: `${start}${end}`,
      start,
      end,
    };
  };

  const answers = await inquirer.prompt([
    {
      type: 'autocomplete',
      name: 'site',
      message: '站点名称',
      source: (_, i = '') => new Promise((resolve) => {
        const fuzzyResult = fuzzy.filter(i, siteList);
        resolve(
          fuzzyResult.map((el) => el.original),
        );
      }),
    },
    {
      type: 'input',
      name: 'id',
      message: '站点 id',
    },
    {
      type: 'input',
      name: 'url',
      message: '完整 url',
      when: (a) => !a.id,
    },
    {
      type: 'input',
      name: 'begin',
      message: `放送开始时间 (${dayjs.tz.guess()})`,
      validate: (i = '') => ((i === '' || dayjs(i).isValid()) ? true : '不支持的时间格式'),
      transformer: (i = '') => {
        const { colorTime, plainTime } = getTime(i);
        const show = dayjs(plainTime).isValid() ? plainTime : defaultTime;
        return `${colorTime}  >>  [${dayjs(show).toISOString()}]`;
      },
    },
    {
      type: 'list',
      name: 'cycle',
      message: '周期',
      choices: Object.keys(cycleList),
      default: '周播',
    },
    {
      type: 'input',
      name: 'broadcast',
      message: `放送时间 (${dayjs.tz.guess()})`,
      validate: (i = '') => ((i === '' || dayjs(i).isValid()) ? true : '不支持的时间格式'),
      transformer: (i, a) => {
        const cycle = cycleList[a.cycle] || 'P7D';
        const { colorTime, plainTime } = getTime(i, `${a.begin}`);

        const show = dayjs(plainTime).isValid() ? plainTime : defaultTime;
        return `${colorTime}  >> [R/${dayjs(show).toISOString()}/${cycle}]`;
      },
    },
    {
      type: 'input',
      name: 'comment',
      message: '备注',
    },
  ]);

  return {
    site: answers.site,
    id: answers.id,
    ...(answers.url ? { url: answers.url } : {}),
    begin: dayjs(getTime(answers.begin).plainTime).toISOString(),
    broadcast: `R/${dayjs(getTime(answers.broadcast, answers.begin).plainTime).toISOString()}/${cycleList[answers.cycle] || 'P7D'}`,
    ...(answers.comment ? { comment: answers.comment } : {}),
  };
};
