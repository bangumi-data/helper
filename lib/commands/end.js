const fs = require('fs-extra');
const ora = require('ora');
const { walk, delay } = require('../utils.js');

const { getEnd } = require('../crawlers/syoboi.js');

module.exports = async function main({ input }) {
  const filePaths = await walk(input, (x) => /\d\d\.json$/.test(x));
  const files = (await Promise.all(
    filePaths.map(async (itemPath) => ({
      path: itemPath,
      items: await fs.readJson(itemPath),
    })),
  )).filter(({ items }) => items.find((item) => !item.end));
  await files.reduce((seq1, file) => seq1.then(async () => {
    const results = await file.items.reduce((seq2, item) => seq2.then(async (items) => {
      if (item.end) return items.concat(item);
      const msg = `[${item.begin.slice(0, 7)}] ${item.title}`;
      const spinner = ora(`Fetching: ${msg}`).start();
      let end = '';
      try {
        await delay(1000);
        end = await getEnd(item.title);
        spinner.succeed(msg);
      } catch (err) {
        spinner.fail(`[${err.message}] ${msg}`);
      }
      return items.concat(Object.assign(item, { end }));
    }), Promise.resolve([]));
    await fs.outputJson(file.path, results, { spaces: 2 });
  }), Promise.resolve());
};
