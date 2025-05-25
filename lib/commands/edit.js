const path = require('path');
const fs = require('fs-extra');
const inquirer = require('inquirer');
const fuzzy = require('fuzzy');
const { flatten, values } = require('lodash');
const sites = require('../sites/index.js');
const { AutocompletePrompt } = require('../utils');

inquirer.registerPrompt('autocomplete', AutocompletePrompt);

const rawTitlePref = '$ ';
const othTitlePref = ' '.repeat(rawTitlePref.length);

module.exports = async function edit({
  input,
  month,
  siteList,
  itemIndex, // validate 命令调用时专用
  force,
}) {
  const isFromValidate = itemIndex !== undefined;

  const itemsJsonFile = path.resolve(input, String(month)
    .replace(/(\d{4})(\d\d)/, '$1/$2.json'));
  const items = await fs.readJson(itemsJsonFile);

  const onairSitesJsonFile = path.join(
    path.dirname(input), 'sites', 'onair.json'
  );
  const onairSites = fs.existsSync(onairSitesJsonFile)
    ? await fs.readJson(onairSitesJsonFile)
    : undefined;

  const titleList = items.reduce((acc, {
    title,
    titleTranslate = {},
  }) => {
    acc.push(rawTitlePref + title);
    Object.keys(titleTranslate)
      .forEach((key) => {
        acc.push(...titleTranslate[key].map((v) => othTitlePref + v));
      });
    return acc;
  }, []);

  let preTitle = undefined;
  const selectItem = async () => {
    let { select } = await inquirer
      .prompt([
        {
          type: 'autocomplete',
          name: 'select',
          message: '选择番剧',
          default: preTitle,
          source: (_, i = '') => new Promise((resolve) => {
            const fuzzyResult = fuzzy.filter(i, titleList);
            resolve(
              fuzzyResult.map((el) => el.original),
            );
          }),
        },
      ]);
    preTitle = select;
    select = select.slice(rawTitlePref.length);

    const selectIndex = items.findIndex(({
      title,
      titleTranslate = {},
    }) => title === select || flatten(values(titleTranslate))
      .includes(select));

    if (selectIndex === -1) {
      console.error('所选番剧未找到');
      return await selectItem();
    }
    return selectIndex;
  }

  const editOnce = async (selectIndex) => {
    selectIndex ??= await selectItem();

    let siteType = 'onair'; // 强制认为siteList参数均为放送站点
    if (siteList.length === 0) {
      siteTypeAnswers = await inquirer
        .prompt([
          {
            type: 'list',
            name: 'siteType',
            message: '选择站点类型',
            choices: ['onair'],
            default: 'onair',
          },
        ]);
      siteType = siteTypeAnswers.siteType;
    }

    if (!sites[siteType]) {
      console.error('不支持所选站点类型');
      process.exit(1);
    }

    const seqSites = items[selectIndex].sites;
    const result = await sites[siteType]
      .add({
        seqSites,
        onairSites,
        siteList,
        isFromValidate,
      });
    if (!result) return undefined;

    const { oldInfoIndex, info } = result;
    const oldInfo = seqSites[oldInfoIndex];
    console.log({ oldInfo, info });
    if (force && oldInfo) {
      seqSites[oldInfoIndex] = info;
    } else {
      items[selectIndex].sites.push(info);
    }

    await fs.outputJson(itemsJsonFile, items, { spaces: 2 });
    return selectIndex;
  }

  if (isFromValidate) {
    await editOnce(itemIndex);
    return;
  }

  let again = true;
  let retainedSelectIndex = null;

  while(again) {
    const selectIndex = await editOnce(retainedSelectIndex);
    if (selectIndex === undefined) {
      retainedSelectIndex = null;
      continue;
    }
    const { cont } = await inquirer.prompt([
      {
        type: 'list',
        name: 'cont',
        message: '继续编辑？',
        choices: ['其他番剧', '本番剧', '退出'],
        default: true,
      }
    ]);
    switch (cont) {
      case '本番剧':
        retainedSelectIndex = selectIndex;
        break;
      case '其他番剧':
        retainedSelectIndex = null;
        break;
      case '退出':
        again = false;
        break;
    }
  }
};
