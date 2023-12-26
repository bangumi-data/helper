const path = require('path');
const fs = require('fs-extra');
const ora = require('ora');

const crawler = require('../crawlers/index.js');
const { walk } = require('../utils.js');

module.exports = async function add({ input, output, bangumiId, siteList }) {
    let jsonFileName, title, meta;
    const spinner = ora(`Searching: ${bangumiId}`).start();
    const files = await walk(input, (item) => /\d\d\.json$/.test(item));
    const filename = await Promise.all(files.map(async (file) => {
        const items = await fs.readJson(file);
        for (const item of items) {
            if (item.sites.some(site => site.site === 'bangumi' && site.id === String(bangumiId))) {
                title = item.title;
                return file;
            }
        }
        return null;
    }))
        .then((results) => results.filter((item) => item !== null));

    // Use file if bangumi entry found, else fetch metadata from bangumi
    if (filename.length === 1) {
        const match = /(\d{4})(?:\\|\/)(\d{2})\.json$/g.exec(filename[0]);
        jsonFileName = `${match[1]}/${match[2]}.json`;
    } else {
        spinner.text = `Fetching: ${bangumiId}`;
        meta = await crawler.bangumi.getMetaFull(bangumiId);
        if (Object.keys(meta).length === 0) {
            spinner.fail(`Failed to fetch: ${bangumiId}`);
            return;
        }
        title = meta.title;
        const beginDate = new Date(meta.begin);
        jsonFileName = `${beginDate.getFullYear()}/${String(beginDate.getMonth() + 1).padStart(2, '0')}.json`;
    }

    // Add to json
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
    spinner.succeed(`Added: ${title} to ${jsonFileName}`);
};