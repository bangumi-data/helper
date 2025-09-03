const cheerio = require('cheerio');
const fs = require('fs-extra');
const path = require('path');
const ora = require('ora');

const { fetch, merge, walk } = require('../utils.js');

const regex = /bgm.tv\/subject\/(\d+)/;

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
    const seasonList = [];
    const months = ["冬", "春", "夏", "秋"];
    for (let year = new Date().getUTCFullYear(); year >= 2014; year--) {
      seasonList.push(...months.map((month) => ({ year, month })));
    }
    seasonList.push({ year: 2013, month: "秋" });
    const items = await seasonList.reduce(
      (sequence, item) =>
        sequence.then(async (acc) => {
            const spinner = ora(`Crawling ${item.year}-${item.month}`).start();
            const $ = await fetch(`https://mikanani.me/Home/BangumiCoverFlowByDayOfWeek?year=${item.year}&seasonStr=${item.month}`)
                .then((res) => res.text())
                .then(cheerio.load);
            const data = $("span.js-expand_bangumi:not(.greyout)")
                .map((i, el) => {
                    const id = $(el).attr("data-bangumiid");
                    return { id };
                })
                .get();
            spinner.stop();
            return acc.concat(data);
        }), Promise.resolve([]));

    const ID_MAP = await getIdMap();
    await items.reduce((sequence, item, idx) => sequence.then(async () => {
        const spinner = ora(`[${idx}/${items.length}]Correcting ID of ${item.id}`).start();
        try {
            const bangumiId = ID_MAP[item.id] || (await correctId(item.id));
            Object.assign(item, { bangumiId });
            ID_MAP[item.id] = bangumiId;
        } catch (err) {
            console.log(err);
        }
        spinner.stop();
    }), Promise.resolve());

    // save ID_MAP
    await saveIdMap(ID_MAP);

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
