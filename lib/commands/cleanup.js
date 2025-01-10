const fs = require("fs-extra");
const ora = require("ora");
const path = require("path");

const crawler = require("../crawlers/index.js");
const { walk } = require("../utils.js");

module.exports = async function main({ input, output, site }) {
  if (
    !crawler[site] ||
    !crawler[site].getAll ||
    !crawler[site].getIsBangumiOffline
  ) {
    throw new Error(`${site} is not supported now.`);
  }
  const items = await crawler[site].getAll();
  const fullIdList = items.map((item) => item.id);
  console.log(`Total: ${fullIdList.length} items online`);
  if (fullIdList.length === 0) {
    return;
  }

  const spinner = ora(`Start Cleanup: ${site}`).start();
  const filePaths = await walk(input, (x) => /\d\d\.json$/.test(x));
  for (const filePath of filePaths) {
    const match = /(\d{4})(?:\\|\/)(\d{2})\.json$/g.exec(filePath);
    const filename = `${match[1]}/${match[2]}.json`;
    spinner.text = `Checking: ${filename}`;
    const json = fs.readJsonSync(filePath);
    for (const item of json) {
      if (
        item.sites.filter((i) => i.site === site && !fullIdList.includes(i.id))
          .length > 0
      ) {
        spinner.start(`Checking ${item.title}`);
        const id = item.sites.find((i) => i.site === site).id;
        
        // Check if bangumi is offline, since online bangumi may be missing from getAll() list
        if (await crawler[site].getIsBangumiOffline(id)) {
          item.sites = item.sites.filter((i) => i.site !== site);
          spinner.succeed(`Removed ${item.title} from ${filename}`);
        }
      }
    }
    const outputJsonFile = path.resolve(output, filename);
    fs.outputJsonSync(outputJsonFile, json, { spaces: 2 });
  }
  spinner.succeed("Cleanup complete!");
};
