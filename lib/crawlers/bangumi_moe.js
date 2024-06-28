const ora = require('ora');

const { fetch, matchBangumi } = require('../utils.js');

exports.getAll = async function getAll() {
    // https://github.com/BangumiMoe/rin-pr-apidoc/blob/master/DOC/api/tag.md
    const spinner = ora(`Crawling`).start();
    const data = await fetch('https://bangumi.moe/api/tag/all')
        .then((res) => res.json())
        .then((data) => data.filter(item => item.type === 'bangumi')
            .map((item) => ({ id: item._id, title: item.name })));
    spinner.stop();
    return data;
};

exports.matchBangumi = async (input, items) => {
    return matchBangumi(input, { items });
}
