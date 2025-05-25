const path = require('path');
const fs = require('fs-extra');
const inquirer = require('inquirer');
const fuzzy = require('fuzzy');
const { flatten, values } = require('lodash');
const sites = require('../sites/index.js');

inquirer.registerPrompt('autocomplete', require('inquirer-autocomplete-prompt'));

module.exports = async function edit({
  input,
  month,
  siteList,
  itemIndex, // validate 命令调用时专用
  force,
}) {
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
    acc.push(title);
    Object.keys(titleTranslate)
      .forEach((key) => {
        acc.push(...titleTranslate[key]);
      });
    return acc;
  }, []);

  const selectItem = async () => {
    const { select } = await inquirer
      .prompt([
        {
          type: 'autocomplete',
          name: 'select',
          message: '选择番剧',
          source: (_, i = '') => new Promise((resolve) => {
            const fuzzyResult = fuzzy.filter(i, titleList);
            resolve(
              fuzzyResult.map((el) => el.original),
            );
          }),
        },
      ]);

    const selectIndex = items.findIndex(({
      title,
      titleTranslate = {},
    }) => title === select || flatten(values(titleTranslate))
      .includes(select));

    if (selectIndex === -1) {
      console.error('所选番剧未找到');
      return selectItem();
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
    const { preInfoIndex, info } = await sites[siteType]
      .add({ seqSites, onairSites, siteList });
    const preInfo = seqSites[preInfoIndex];
    console.log({ preInfo, info });
    if (force && preInfo) {
      seqSites[preInfoIndex] = info;
    } else {
      items[selectIndex].sites.push(info);
    }

    await fs.outputJson(itemsJsonFile, items, { spaces: 2 });
    return selectIndex;
  }

  if (itemIndex !== undefined) {
    await editOnce(itemIndex);
    return;
  }

  let again = true;
  let retainedSelectIndex = null;

  while(again) {
    const selectIndex = await editOnce(retainedSelectIndex);
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
        again = true;
        retainedSelectIndex = selectIndex;
        break;
      case '其他番剧':
        again = true;
        retainedSelectIndex = null;
        break;
      case '退出':
        again = false;
        retainedSelectIndex = null;
        break;
    }
  }
};
