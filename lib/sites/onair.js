const inquirer = require('inquirer');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const quarterOfYear = require('dayjs/plugin/quarterOfYear');
const dayjs = require('dayjs');
const fuzzy = require('fuzzy');
const ora = require('ora');
const chalk = require('chalk');

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

const invertedCycleList = Object.fromEntries(
  Object.entries(cycleList).map(([key, value]) => [value, key])
);

const addedSitePref = '# ';
const otherSitePref = ' '.repeat(addedSitePref.length);

let baseSiteList = [
  'acfun',
  'bilibili',
  'bilibili_hk_mo_tw',
  'bilibili_hk_mo',
  'bilibili_tw',
  'youku',
  'qq',
  'iqiyi',
  'letv',
  'mgtv',
  'nicovideo',
  'netflix',
  'gamer',
  'gamer_hk',
  'muse_hk',
  'muse_tw',
  'ani_one',
  'ani_one_asia',
  'viu',
  'mytv',
  'disneyplus',
  'unext',
  'abema',
  'crunchyroll',
  'danime',
  'tropics',
  'prime',
];

let addedSiteList = [];

function addSitePref(site) {
  return (addedSiteList.has(site) ? addedSitePref : otherSitePref) + site;
}

exports.add = async function add({
  seqSites,       // 已有的站点信息
  onairSites,     // 所有放送站点列表
  siteList,       // 待选放送站点列表
  isFromValidate, // 由 validate 命令发起调用
}) {
  if (onairSites) baseSiteList = Object.keys(onairSites);
  addedSiteList = seqSites.reduce((acc, site) => acc.add(site.site), new Set());

  let defaultTime = dayjs().startOf('quarter').format('YYYYMMDDHHmmss');
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

  let selectedSite = null;
  const backOption = '↩ 返回其他番剧';
  const selectSite = async (options, again = false) => {
    if (again) {
      console.error('不支持所选站点', siteList, '请重新选择');
    }
    options = options.map(
      (site) => addSitePref(site)
    );
    options.push(backOption);
    const { site } = await inquirer.prompt([
      {
        type: 'autocomplete',
        name: 'site',
        message: '站点名称',
        source: (_, i = '') => new Promise((resolve) => {
          const fuzzyResult = fuzzy.filter(i, options);
          resolve(
            fuzzyResult.map((el) => el.original),
          );
        }),
      },
    ]);
    if (site === backOption) {
      selectedSite = undefined;
    } else {
      selectedSite = site.slice(addedSitePref.length);
    }
  }

  if (siteList.length === 0) {
    await selectSite(baseSiteList);
  } else {
    const siteReg = new RegExp(`^(${siteList.join('|').replaceAll('*', '.*')})$`);
    siteOptions = baseSiteList.filter((site) => siteReg.test(site));
    const length = siteOptions.length;
    if (length === 0) {
      await selectSite(baseSiteList, true);
    } else if (length === 1 && isFromValidate) {
      selectedSite = siteOptions[0];
      ora().succeed(`站点名称 ${chalk.cyan(addSitePref(selectedSite))}`);
    } else {
      await selectSite(siteOptions);
    }
  }
  if (selectedSite === undefined) {
    return undefined;
  }

  const oldInfoIndex = seqSites.findIndex((site) => site.site === selectedSite);
  const oldInfo = seqSites[oldInfoIndex];
  if (oldInfo?.begin) {
    defaultTime = dayjs.utc(oldInfo.begin).local().format('YYYYMMDDHHmmss');
  }

  const urlAnswers = await inquirer.prompt([
    {
      type: 'input',
      name: 'id',
      message: '站点 id',
      default: oldInfo?.id,
    },
    {
      type: 'input',
      name: 'url',
      message: '完整 url',
      default: oldInfo?.url,
      when: (a) => !a.id,
    },
  ]);

  if (onairSites && !urlAnswers.url) {
    const url = onairSites[selectedSite].urlTemplate.replace('{{id}}', urlAnswers.id);
    ora().succeed(`完整 url ${chalk.cyan(url)}`);
  }

  const answers = await inquirer.prompt([
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
      default: invertedCycleList[oldInfo?.broadcast.split('/').pop()] || '周播',
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
      default: oldInfo?.comment
    },
  ]);

  return {
    oldInfoIndex,
    info: {
      site: selectedSite,
      id: urlAnswers.id,
      ...(urlAnswers.url ? { url: urlAnswers.url } : {}),
      begin: dayjs(getTime(answers.begin).plainTime).toISOString(),
      broadcast: `R/${dayjs(getTime(answers.broadcast, answers.begin).plainTime).toISOString()}/${cycleList[answers.cycle] || 'P7D'}`,
      ...(answers.comment ? { comment: answers.comment } : {}),
    }
  };
};
    