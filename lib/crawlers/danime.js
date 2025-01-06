const ora = require('ora');
const { matchBangumi } = require('../utils.js');

const pageSize = 300;

async function getAllBangumi(initialCollectionKey, consonantKey, page, total) {
    let currentGojuon;
    switch (initialCollectionKey) {
        case 1:
            switch (consonantKey) {
                case 1:
                    currentGojuon = 'あ';
                    break;
                case 2:
                    currentGojuon = 'い';
                    break;
                case 3:
                    currentGojuon = 'う';
                    break;
                case 4:
                    currentGojuon = 'え';
                    break;
                case 5:
                    currentGojuon = 'お';
                    break;
            }
            break;
        case 2:
            switch (consonantKey) {
                case 1:
                    currentGojuon = 'か';
                    break;
                case 2:
                    currentGojuon = 'き';
                    break;
                case 3:
                    currentGojuon = 'く';
                    break;
                case 4:
                    currentGojuon = 'け';
                    break;
                case 5:
                    currentGojuon = 'こ';
                    break;
            }
            break;
        case 3:
            switch (consonantKey) {
                case 1:
                    currentGojuon = 'さ';
                    break;
                case 2:
                    currentGojuon = 'し';
                    break;
                case 3:
                    currentGojuon = 'す';
                    break;
                case 4:
                    currentGojuon = 'せ';
                    break;
                case 5:
                    currentGojuon = 'そ';
                    break;
            }
            break;
        case 4:
            switch (consonantKey) {
                case 1:
                    currentGojuon = 'た';
                    break;
                case 2:
                    currentGojuon = 'ち';
                    break;
                case 3:
                    currentGojuon = 'つ';
                    break;
                case 4:
                    currentGojuon = 'て';
                    break;
                case 5:
                    currentGojuon = 'と';
                    break;
            }
            break;
        case 5:
            switch (consonantKey) {
                case 1:
                    currentGojuon = 'な';
                    break;
                case 2:
                    currentGojuon = 'に';
                    break;
                case 3:
                    currentGojuon = 'ぬ';
                    break;
                case 4:
                    currentGojuon = 'ね';
                    break;
                case 5:
                    currentGojuon = 'の';
                    break;
            }
            break;
        case 6:
            switch (consonantKey) {
                case 1:
                    currentGojuon = 'は';
                    break;
                case 2:
                    currentGojuon = 'ひ';
                    break;
                case 3:
                    currentGojuon = 'ふ';
                    break;
                case 4:
                    currentGojuon = 'へ';
                    break;
                case 5:
                    currentGojuon = 'ほ';
                    break;
            }
            break;
        case 7:
            switch (consonantKey) {
                case 1:
                    currentGojuon = 'ま';
                    break;
                case 2:
                    currentGojuon = 'み';
                    break;
                case 3:
                    currentGojuon = 'む';
                    break;
                case 4:
                    currentGojuon = 'め';
                    break;
                case 5:
                    currentGojuon = 'も';
                    break;
            }
            break;
        case 8:
            switch (consonantKey) {
                case 1:
                    currentGojuon = 'や';
                    break;
                case 2:
                    currentGojuon = 'ゆ';
                    break;
                case 3:
                    currentGojuon = 'よ';
                    break;
            }
            break;
        case 9:
            switch (consonantKey) {
                case 1:
                    currentGojuon = 'ら';
                    break;
                case 2:
                    currentGojuon = 'り';
                    break;
                case 3:
                    currentGojuon = 'る';
                    break;
                case 4:
                    currentGojuon = 'れ';
                    break;
                case 5:
                    currentGojuon = 'ろ';
                    break;
            }
            break;
        case 10:
            switch (consonantKey) {
                case 1:
                    currentGojuon = 'わ';
                    break;
                case 2:
                    currentGojuon = 'を';
                    break;
                case 3:
                    currentGojuon = 'ん';
                    break;
            }
            break;
    }
    const spinner = ora(`Crawling ${currentGojuon} page ${page}/${total || '?'}`).start();
    const json = await fetch(`https://animestore.docomo.ne.jp/animestore/rest/WS000108?workTypeList=anime&length=${pageSize}&start=${(page - 1) * pageSize}&initialCollectionKey=${initialCollectionKey}&consonantKey=${consonantKey}&vodTypeList=svod`)
        .then((res) => res.json());
    if (json.resultCd != '00') {
        spinner.stop();
        return [];
    }

    spinner.stop();

    const totalPage = Math.ceil(json.data.maxCount / pageSize);
    const items = json.data.workList.map((work) => {
        return { id: work.workId, title: work.workInfo.workTitle, img: work.workInfo.mainKeyVisualPath };
    });
    if (page < totalPage) {
        return items.concat(await getAllBangumi(initialCollectionKey, consonantKey, page + 1, totalPage));
    }
    return items;
}
async function getAllBangumiByGenre(genreCd, page, total) {
    let currentGenre = '';
    switch (genreCd) {
        case 24:
            currentGenre = 'ライブ/ラジオ/etc';
            break;
        case 25:
            currentGenre = '2.5次元舞台';
            break;
    }
    const spinner = ora(`Crawling ${currentGenre} page ${page}/${total || '?'}`).start();
    const json = await fetch(`https://animestore.docomo.ne.jp/animestore/rest/WS000107?length=${pageSize}&start=${(page - 1) * pageSize}&genreCd=${genreCd}&vodTypeList=svod`)
        .then((res) => res.json());
    if (json.resultCd != '00') {
        spinner.stop();
        return [];
    }

    spinner.stop();

    const totalPage = Math.ceil(json.data.maxCount / pageSize);
    const items = json.data.workList.map((work) => {
        return { id: work.workId, title: work.workInfo.workTitle, img: work.workInfo.mainKeyVisualPath };
    });
    if (page < totalPage) {
        return items.concat(await getAllBangumiByGenre(genreCd, page + 1, totalPage));
    }
    return items;
}

exports.getAll = async function getAll() {
    let items = [];

    // 50音順
    for (let i = 1; i <= 10; i++) {
        for (let j = 1; j <= ((i === 8 || i === 10) ? 3 : 5); j++) {
            items.push(... await getAllBangumi(i, j, 1));
        }
    }

    // remove 2.5次元舞台/ライブ/ラジオ/etc
    const itemsLive = await getAllBangumiByGenre(24, 1);
    const items2_5Dimensional = await getAllBangumiByGenre(25, 1);

    return items.filter((i) => {
        return !itemsLive.find((j) => j.id === i.id)
            && !items2_5Dimensional.find((j) => j.id === i.id)
            ;
    })
    .sort((a, b) => b.id - a.id);
};

exports.getBegin = async function getBegin(id) {
    const data = await fetch(`https://animestore.docomo.ne.jp/rest/v1/works/${id}`)
        .then((res) => res.json());
    return new Date(data?.distribution?.released_at?.date_time).toISOString() ?? '';
};

exports.matchBangumi = async (input, items) => {
    return matchBangumi(input, { items });
}

exports.getIsBangumiOffline = async (id) => {
    return await fetch(`https://animestore.docomo.ne.jp/rest/v1/works/${id}`)
        .then((res) => res.status === 404);
}
