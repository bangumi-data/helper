const fs = require('fs-extra');
const path = require('path');
const ora = require('ora');
const pkg = require('../../package.json');

const { fetch, matchBangumi } = require('../utils.js');
const helperVersion = pkg?.version ?? '0.2.11';

async function getAllBangumi(categoryCode, page, total) {
    const spinner = ora(`Crawling ${categoryCode} page ${page}/${total || '?'}`).start();
    const data = await fetch(`https://cc.unext.jp/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Apollographql-Client-Name': 'bangumi-data-helper',
            'Apollographql-Client-Version': helperVersion
        },
        body: JSON.stringify({
            operationName: "cosmo_VideoCategory",
            variables: {
                categoryCode: categoryCode,
                page: page,
                filterSaleType: null,
                // sortOrder: "PRODUCTION_YEAR_DESC"
                sortOrder: "PUBLIC_START_DESC"
            },
            query: "query cosmo_VideoCategory($categoryCode: ID!, $page: Int!, $sortOrder: PortalSortOrder!, $dubSubFilter: DubSubType, $filterSaleType: SaleType){\n webfront_searchVideo(\n categoryCode: $categoryCode\n page: $page\n pageSize: 100\n sortOrder: $sortOrder\n dubSubFilter: $dubSubFilter\n filterSaleType: $filterSaleType\n){\n pageInfo{\n page\n pageSize\n pages\n results\n __typename\n}\n titles{\n id\n titleName\n thumbnail{\n standard\n __typename\n} __typename\n}\n    __typename\n}\n}\n"
        })
    })
        .then((res) => res.json());
    spinner.stop();

    const totalPage = data.data.webfront_searchVideo.pageInfo.pages;
    const items = data.data.webfront_searchVideo.titles.map((title) => {
        return { id: title.id, title: title.titleName, img: title.thumbnail.standard };
    });
    if (page < totalPage) {
        return items.concat(await getAllBangumi(categoryCode, page + 1, totalPage));
    }
    return items;
}

exports.getAll = async function getAll() {
    return await Promise.all([
        getAllBangumi("MNU0000768", 1), // アニメ
        getAllBangumi("MNU0000705", 1), // 劇場版アニメ（海外）
        getAllBangumi("MNU0011169", 1), // 声優
        getAllBangumi("MNU0011170", 1), // アニソン・声優ライブ
        getAllBangumi("MNU0012326", 1), // アニソン・声優 MV
        getAllBangumi("MNU0011171", 1), // 2.5次元
        getAllBangumi("MNU0013287", 1), // 特撮・せんたい
        getAllBangumi("MNU0013289", 1), // 海外アニメ
        getAllBangumi("MNU0013291", 1), // えいご教育
    ]).then(([items, itemsMovie, itemsSeiyuu, itemsSeiyuuLive, itemsSeiyuuMV, items2_5Dimensional, itemsTokusatsu, itemsOversea, itemsEnglish]) => {
        return items.filter((i) => {
            return !itemsMovie.find((j) => j.id === i.id)
                && !itemsSeiyuu.find((j) => j.id === i.id)
                && !itemsSeiyuuLive.find((j) => j.id === i.id)
                && !itemsSeiyuuMV.find((j) => j.id === i.id)
                && !items2_5Dimensional.find((j) => j.id === i.id)
                && !itemsTokusatsu.find((j) => j.id === i.id)
                && !itemsOversea.find((j) => j.id === i.id)
                && !itemsEnglish.find((j) => j.id === i.id)
                ;
        });
    });
};

exports.getBegin = async function getBegin(id) {
    const data = await fetch(`https://cc.unext.jp/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Apollographql-Client-Name': 'bangumi-data-helper',
            'Apollographql-Client-Version': helperVersion
        },
        body: JSON.stringify({
            operationName: "cosmo_getVideoTitle",
            variables: {
                code: id
            },
            query: "query cosmo_getVideoTitle($code: ID!) {\n  webfront_title_stage(id: $code) {\n publicStartDate\n publicMainEpisodeCount\n}\n}\n"
        })
    })
        .then((res) => res.json());
    return data.data.webfront_title_stage.publicMainEpisodeCount > 0 ? data.data.webfront_title_stage.publicStartDate : '';
};

exports.matchBangumi = async (input, items) => {
    return matchBangumi(input, { items });
}

exports.getIsBangumiOffline = async (id) => {
    const data = await fetch(`https://cc.unext.jp/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Apollographql-Client-Name': 'bangumi-data-helper',
            'Apollographql-Client-Version': helperVersion
        },
        body: JSON.stringify({
            operationName: "cosmo_getVideoTitle",
            variables: {
                code: id
            },
            query: "query cosmo_getVideoTitle($code: ID!) {\n  webfront_title_stage(id: $code) {\n publicStartDate\n publicMainEpisodeCount\n}\n}\n"
        })
    })
        .then((res) => res.json());
    return data.errors !== undefined;
}
