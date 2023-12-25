const fs = require('fs-extra');
const path = require('path');
const ora = require('ora');
const puppeteer = require('puppeteer');

const { fetch, matchBangumi } = require('../utils.js');

const pageSize = 100;
const abemaApi = 'https://api.p-c3-e.abema-tv.com/v1/video';

async function getAllBangumi(token, page) {
    const spinner = ora(`Crawling page ${page}/?`).start();
    const data = await fetch(`${abemaApi}/featureGenres/animation/cards?onlyFree=false&limit=${pageSize}&next=${page*pageSize}`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
        .then((res) => res.json());
    spinner.stop();

    const items = await Promise.all(data.cards.map(async (title) => {
        const img = `${title.thumbComponent.urlPrefix}/${title.thumbComponent.filename}`;
        const seriesData = await fetch(`${abemaApi}/series/${title.seriesId}?includeSlot=true`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
            .then((res) => res.json());

        if(seriesData.orderedSeasons && seriesData.orderedSeasons.length > 1){
            return seriesData.orderedSeasons.map((season) => {
                return { id: title.seriesId, title: `${title.title} ${season.name}`, img };
            });
        } else {
            return { id: title.seriesId, title: title.title, img };
        }
    }));
    if (items.length > 0) {
        return items.flat().concat(await getAllBangumi(token, page + 1));
    }
    return items.flat();
}

async function getToken() {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto('https://abema.tv/');
    await page.waitForNetworkIdle();
    const token = await page.evaluate(() => {
        let abm_token = null;
        for (let i = 0; i < localStorage.length; i++) {
            if (localStorage.key(i) === 'abm_token') {
                abm_token = localStorage.getItem(localStorage.key(i));
            };
        }
        return abm_token;
    });
    await browser.close();

    return token;
}

exports.getAll = async function getAll() {
    const token = await getToken();
    return getAllBangumi(token, 0);
};

exports.getBegin = async function getBegin() {
    return '';
};

exports.matchBangumi = async (input, items) => {
    return matchBangumi(input, { items });
}
