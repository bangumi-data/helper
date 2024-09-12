const cheerio = require('cheerio');
const fs = require('fs-extra');
const path = require('path');
const ora = require('ora');

const { fetch, merge, walk } = require('../utils.js');

const regex = /bgm.tv\/subject\/(\d+)/;
const fetchLimit = 100;

async function getIdMap() {
    const spinner = ora('Fetching mikan ID Map').start();
    const api = 'https://cdn.jsdelivr.net/gh/bangumi-data/helper@master/lib/crawlers/dicts/mikan.json';
    const remote = await fetch(api).then((res) => (res.ok ? res.json() : {})).catch(() => ({}));
    const idMapFile = path.resolve(__dirname, './dicts/mikan.json');
    const local = await fs.readJSON(idMapFile).catch(() => ({}));
    spinner.stop();
    return { ...local.ID_MAP, ...remote.ID_MAP };
}

async function saveIdMap(ID_MAP) {
    const outputFile = path.resolve(__dirname, './dicts/mikan.json');
    await fs.outputJson(outputFile, { ID_MAP }, { spaces: 2 });
}

async function correctId(id) {
    const $ = await fetch(`https://mikanani.me/Home/Bangumi/${id}`)
        .then((res) => res.text())
        .then(cheerio.load);
    const href = $('.bangumi-info>a').map((i, a) => $(a).attr('href'))
        .filter((i, href) => regex.test(href))[0];
    return href ? regex.exec(href)[1] : undefined;
}

exports.getAll = async function getAll() {
    let ID_MAP = await getIdMap();
    const maxId = Math.max(...Object.keys(ID_MAP));

    // fetch next fetchLimit ids on mikan
    const conditions = [];
    for (let id = maxId - 100; id <= maxId + fetchLimit; id++) {
        conditions.push(id);
    }

    // find bangumiId
    await conditions.reduce((sequence, condition) => sequence.then(async () => {
        const spinner = ora(`Crawling ${condition}`).start();
        const bangumiId = await correctId(condition);
        spinner.stop();

        if(bangumiId) {
            ID_MAP[condition] = bangumiId;
        }

        spinner.stop();
    }), Promise.resolve());

    // save ID_MAP
    await saveIdMap(ID_MAP);
    
    const items = Object.entries(ID_MAP).map(([key, value]) => {
        return {
            id: key,
            bangumiId: value
        }
    })
    return items;
};

exports.matchBangumi = async (input, items) => {
    const files = await walk(input, (item) => /\d\d\.json$/.test(item));
    const existingBangumi = await Promise.all(files.map(async file => {
        const result = await fs.readJson(file, 'utf-8');
        return { file, result };
    }));

    const todo = [];
    for (const item of items) {
        const spinner = ora(`Matching bangumi: ${item.id}`).start();

        const fileToAdd = existingBangumi.map((localFile) => {
            let titleMatch = localFile.result.map((existingBangumi) => {
                // found existing record for site, skip matching
                if (existingBangumi.sites.some((site) => site.site === item.site)) {
                    return null;
                }

                // match bangumiId
                let matchedTitle = null;
                const filteredSites = existingBangumi.sites.filter((site) => site.site === 'bangumi');
                if (filteredSites.length === 1 && filteredSites[0].id === item.bangumiId) {
                    matchedTitle = existingBangumi.title;
                }
                return matchedTitle;
            })
            .filter(value => value != null);

            return titleMatch.length === 1 ? {
                file: localFile.file,
                title: titleMatch[0],
            } : null;
        })
        .filter(value => value != null);

        if (fileToAdd.length === 1) {
            const matchedFile = fileToAdd[0].file;

            let siteForMerge = { site: item.site, id: item.id };
            const objectForMerge = [{
                title: fileToAdd[0].title,
                sites: [siteForMerge],
            }];

            await Promise.resolve(fs.readJson(matchedFile))
                .catch(() => [])
                .then((origin) => merge(origin, objectForMerge, 'title'))
                .then((merged) => fs.outputJson(matchedFile, merged, { spaces: 2 }))
                .catch(console.error);

            const found = /(\d{4})[\\\/](\d{2})\.json/.exec(matchedFile);
            const saveToFileName = `${found[1]}-${found[2]}`;
            spinner.succeed(`Matched. [${saveToFileName}] ${fileToAdd[0].title} (${item.id})`);
        } else {
            todo.push(item);
            spinner.stop();
        }
    }
    return todo;
}
