const fs = require('fs-extra');
const ora = require('ora');

const { merge, walk } = require('../utils.js');

exports.getAll = async function getAll() {
    const seasonList = [];
    const months = ["冬", "春", "夏", "秋"];
    seasonList.push({ year: 2025, month: "夏" });
    seasonList.push({ year: 2025, month: "秋" });
    for (let year = new Date().getUTCFullYear(); year >= 2026; year--) {
      seasonList.push(...months.map((month) => ({ year, month })));
    }
    const items = await seasonList.reduce(
        (sequence, item) =>
            sequence.then(async (acc) => {
                const spinner = ora(`Crawling ${item.year}-${item.month}`).start();
                const data = await fetch(`https://anibt.net/api/seasons/anime?season=${item.year}${item.month}`)
                    .then((res) => res.json())
                    .then((json) => json.data.byWeekday.map((i) =>
                        i.animes.map((a) => { return { id: a.bgmId }; })
                    )
                        .flat());
                spinner.stop();
                return acc.concat(data);
            }), Promise.resolve([]));

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
                const filteredSites = existingBangumi.sites.filter((site) => site.site === 'bangumi' && site.id === String(item.id));
                if (filteredSites.length === 1) {
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

        if (fileToAdd.length > 0) {
            for (const file of fileToAdd) {
                const matchedFile = file.file;

                let siteForMerge = { site: item.site, id: item.id };
                const objectForMerge = [{
                    title: file.title,
                    sites: [siteForMerge],
                }];

                await Promise.resolve(fs.readJson(matchedFile))
                    .catch(() => [])
                    .then((origin) => merge(origin, objectForMerge, 'title'))
                    .then((merged) => fs.outputJson(matchedFile, merged, { spaces: 2 }))
                    .catch(console.error);

                const found = /(\d{4})[\\\/](\d{2})\.json/.exec(matchedFile);
                const saveToFileName = `${found[1]}-${found[2]}`;
                spinner.succeed(`Matched. [${saveToFileName}] ${file.title} (${item.id})`);
            }
        } else {
            todo.push(item);
            spinner.stop();
        }
    }
    return todo;
}
