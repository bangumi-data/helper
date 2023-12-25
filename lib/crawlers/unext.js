const fs = require('fs-extra');
const path = require('path');
const ora = require('ora');

const { fetch, matchBangumi } = require('../utils.js');

async function getAllBangumi(page, total) {
    const spinner = ora(`Crawling page ${page}/${total || '?'}`).start();
    const data = await fetch(`https://cc.unext.jp/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            operationName: "cosmo_VideoCategory",
            variables: {
                categoryCode: "MNU0000768",
                page: page,
                filterSaleType: null,
                sortOrder: "PRODUCTION_YEAR_DESC"
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
        return items.concat(await getAllBangumi(page + 1, totalPage));
    }
    return items;
}

exports.getAll = async function getAll() {
    return getAllBangumi(1);
};

exports.getBegin = async function getBegin(id) {
    const data = await fetch(`https://cc.unext.jp/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            operationName: "cosmo_getVideoTitle",
            variables: {
                code: id
            },
            query: "query cosmo_getVideoTitle($code: ID!) {\n  webfront_title_stage(id: $code) {\n publicStartDate\n}\n}\n"
        })
    })
        .then((res) => res.json());
    return data.data.webfront_title_stage.publicStartDate;
};

exports.matchBangumi = async (input, items) => {
    return matchBangumi(input, { items });
}
