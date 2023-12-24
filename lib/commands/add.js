const path = require('path');
const fs = require('fs-extra');
const ora = require('ora');

const crawler = require('../crawlers/index.js');

module.exports = async function add({ input, output, bangumiId, siteList }) {
    const spinner = ora(`Fetching: ${bangumiId}`).start();
    const meta = await crawler.bangumi.getMetaFull(bangumiId);
    if (Object.keys(meta).length === 0) {
        spinner.fail(`Failed to fetch: ${bangumiId}`);
        return;
    }

    // Add to json
    const beginDate = new Date(meta.begin);
    const jsonFileName = `${beginDate.getFullYear()}/${String(beginDate.getMonth() + 1).padStart(2, '0')}.json`;
    const jsonFile = path.resolve(input, jsonFileName);
    const items = fs.existsSync(jsonFile) ? await fs.readJson(jsonFile) : [];
    const index = items.findIndex(item => item.sites.some(site => site.site === 'bangumi' && site.id === String(bangumiId)));
    if (index > -1) {
        for (const site of siteList) {
            const [siteName, siteId] = site.split(':');
            items[index].sites.push({ site: siteName, id: siteId });
        }
    } else {
        for (const site of siteList) {
            const [siteName, siteId] = site.split(':');
            meta.sites.push({ site: siteName, id: siteId });
        }
        items.push(meta);
    }
    const outputJsonFile = path.resolve(output, jsonFileName);
    await fs.outputJson(outputJsonFile, items, { spaces: 2 });
    spinner.succeed(`Added: ${meta.title} to ${jsonFileName}`);
};