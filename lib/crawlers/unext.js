const fs = require('fs-extra');
const path = require('path');
const ora = require('ora');
const pkg = require('../../package.json');

const { fetch, matchBangumi } = require('../utils.js');
const helperVersion = pkg?.version ?? '0.2.11';

async function getAllBangumi(categoryCode, page, total) {
    const spinner = ora(`Crawling ${categoryCode} page ${page}/${total || '?'}`).start();
    const data = await fetch(
      `https://cc.unext.jp/?operationName=cosmo_VideoCategory&variables=%7B%22categoryCode%22%3A%22${categoryCode}%22%2C%22page%22%3A${page}%2C%22filterSaleType%22%3Anull%2C%22sortOrder%22%3A%22PRODUCTION_YEAR_DESC%22%7D&extensions=%7B%22persistedQuery%22%3A%7B%22version%22%3A1%2C%22sha256Hash%22%3A%2244354c73d3e2ef7b50a63423ed1a9ba6cd849c9043232af98f5438867c74c8b3%22%7D%7D`,
      {
        headers: {
          "Content-Type": "application/json",
          "Apollographql-Client-Name": "bangumi-data-helper",
          "Apollographql-Client-Version": helperVersion,
        },
      },
    ).then((res) => res.json());
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
    const data = await fetch(
      `https://cc.unext.jp/?operationName=cosmo_getVideoTitle&variables=%7B%22code%22%3A%22${id}%22%7D&extensions=%7B%22persistedQuery%22%3A%7B%22version%22%3A1%2C%22sha256Hash%22%3A%22c7d557d11776b11c3ca0c920906d79891861117a39b864c56bc074e5628b7163%22%7D%7D`,
      {
        headers: {
          "Content-Type": "application/json",
          "Apollographql-Client-Name": "cosmo",
          "Apollographql-Client-Version": "v121.0-prod-9726f1d",
        },
      },
    ).then((res) => res.json());
    return data.data.webfront_title_stage.publicMainEpisodeCount > 0 ? data.data.webfront_title_stage.publicStartDate : '';
};

exports.matchBangumi = async (input, items) => {
    return matchBangumi(input, { items });
}

exports.getIsBangumiOffline = async (id) => {
    const data = await fetch(
      `https://cc.unext.jp/?operationName=cosmo_getVideoTitle&variables=%7B%22code%22%3A%22${id}%22%7D&extensions=%7B%22persistedQuery%22%3A%7B%22version%22%3A1%2C%22sha256Hash%22%3A%22c7d557d11776b11c3ca0c920906d79891861117a39b864c56bc074e5628b7163%22%7D%7D`,
      {
        headers: {
          "Content-Type": "application/json",
          "Apollographql-Client-Name": "cosmo",
          "Apollographql-Client-Version": "v121.0-prod-9726f1d",
        },
      },
    ).then((res) => res.json());
    return data.errors !== undefined;
}
