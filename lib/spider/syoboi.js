const cheerio = require('cheerio');
const fetch = require('node-fetch');
const { objectValues } = require('../utils.js');

/**
 * 获取当季番剧列表（TID 和官网链接）
 * @param  {String} season 格式如 '2016q3'
 * @return {Promise}
 */
function getList(season) {
  const api = `http://cal.syoboi.jp/quarter/${season}`;
  return fetch(api)
    .then(res => res.text())
    .then(cheerio.load)
    .then($ =>
      $('.titlesDetail > a')
        .map((idx, a) => {
          const $a = $(a).next().find('.links a').first();
          const isOffical = $a.text().startsWith('公式') || $a.text() === 'TBS';
          return {
            tid: $(a).attr('name'),
            link: isOffical ? $a.attr('href') : ''
          };
        })
        .get()
    );
}

/**
 * 获取番剧 meta 信息
 * @param  {Array} list 番剧列表
 * @return {Promise}
 */
function getMetas(list) {
  const tids = list.map(li => li.tid);
  const api = `http://cal.syoboi.jp/json.php?Req=TitleFull&TID=${tids}`;
  return fetch(api)
    .then(res => res.json())
    .then(json => objectValues(json['Titles']))
    .then(metas =>
      metas
        .filter(meta => meta['Cat'] === '1' || meta['Cat'] === '10')
        .map(meta => {
          const item = list.find(li => li.tid === meta['TID']);
          meta.link = (item || {}).link;
          return meta;
        })
    );
}

/**
 * 获取节目放送信息
 * @param  {String} tid   番剧 ID
 * @param  {String} count 集数
 * @return {Promise}
 */
function getProgram(tid, count) {
  const api = `http://cal.syoboi.jp/json.php?Req=ProgramByCount&TID=${tid}&Count=${count}`;
  return fetch(api)
    .then(res => res.json())
    .then(json => objectValues(json['Programs']))
    .then(programs => programs.sort((a, b) => a['StTime'] - b['StTime']))
    .then(programs => programs.length ? programs[0] : null);
}

/**
 * 获取番剧最早和最晚的集数
 * @param  {String} subTitles 分集标题信息
 * @return {Array}
 */
function getCount(subTitles) {
  const arr = (subTitles.match(/\*\d+\*/g) || [])
    .map(str => str.match(/\d+/)[0] * 1);
  return arr.length ? [arr[0], arr.pop()] : [null, null];
}

/**
 * 获取放送时间
 * @param  {Object} metas 番剧 meta 数据对象
 * @param  {Number} type  为 0 或 1，代表 begin 或 end
 * @return {Promise}
 */
function getDate(metas, type) {
  const now = new Date().toISOString().slice(0, 7).replace('-', '') * 1;
  return metas
    .filter(meta => {
      if (!type) return true;
      const end = meta['FirstEndYear'] * 100 + meta['FirstEndMonth'] * 1;
      return end && end < now;
    })
    .reduce((sequence, meta) => sequence.then(programs =>
      getProgram(meta['TID'], getCount(meta['SubTitles'])[type])
        .then(program => programs.concat(program))
    ), Promise.resolve([]))
    .then(programs => programs.filter(program => program))
    .then(programs =>
      metas.map(meta => {
        const program = programs.find(p => p['TID'] === meta['TID']);
        const time = type ? 'EdTime' : 'StTime';
        if (program) {
          meta[time] = new Date(program[time] * 1000).toISOString();
        }
        return meta;
      })
    );
}

module.exports = function(season) {
  return getList(season)
    .then(getMetas)
    .then(metas => getDate(metas, 0))
    .then(metas => getDate(metas, 1))
    .then(metas =>
      metas.map(meta => {
        const item = {
          title: meta['Title'],
          titleTranslate: {},
          lang: 'jp',
          officialSite: meta.link || '',
          begin: meta['StTime'] || '',
          end: meta['EdTime'] || '',
          comment: '',
          sites: []
        };
        if (meta['TitleEN']) {
          item.titleTranslate['en-US'] = [meta['TitleEN']];
        }
        return item;
      })
    )
    .catch(console.log);
};
