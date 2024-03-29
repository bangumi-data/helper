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
}) {
  const jsonFile = path.resolve(input, String(month)
    .replace(/(\d{4})(\d\d)/, '$1/$2.json'));
  const items = await fs.readJson(jsonFile);

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
    process.exit(1);
  }

  const { siteType } = await inquirer
    .prompt([
      {
        type: 'list',
        name: 'siteType',
        message: '选择站点类型',
        choices: ['onair'],
        default: 'onair',
      },
    ]);

  if (!sites[siteType]) {
    console.error('不支持所选站点类型');
    process.exit(1);
  }

  const info = await sites[siteType].add();
  items[selectIndex].sites.push(info);

  await fs.outputJson(jsonFile, items, { spaces: 2 });
};
