const cheerio = require('cheerio');
const ora = require('ora');

const { fetch, delay } = require('../utils.js');

const spinner = ora();

/**
 * 获取当季番剧列表（TID 和官网链接）
 * @param  {String} season 格式如 '2016q3'
 * @return {Promise}
 */
async function getList(season) {
  const api = `http://cal.syoboi.jp/quarter/${season}`;
  const $ = await fetch(api)
    .then((res) => res.text())
    .then(cheerio.load);
  return $('.titlesDetail > a')
    .map((idx, a) => {
      const link = $(a).next().find('td > a:has(> img)').attr('href');
      return {
        tid: $(a).attr('name'),
        link: /^\/tid\/\d+/.test(link) ? '' : link,
      };
    })
    .get();
}

/**
 * 获取番剧 meta 信息
 * @param  {Array} list 番剧列表
 * @return {Promise}
 */
async function getMetas(list) {
  const tids = list.map((li) => li.tid);
  const api = `http://cal.syoboi.jp/json.php?Req=TitleFull&TID=${tids}`;
  const json = await fetch(api).then((res) => res.json());
  return Object.values(json.Titles)
    .filter((meta) => meta.Cat === '1' || meta.Cat === '10')
    .map((meta) => {
      const item = list.find((li) => li.tid === meta.TID);
      meta.link = (item || {}).link;
      return meta;
    });
}

/**
 * 获取节目放送信息
 * TODO: TID=3179，一二集连播，查询 count=1 数据不对
 * @param  {String} tid   番剧 ID
 * @param  {String} count 集数
 * @return {Promise}
 */
async function getProgram(tid, count) {
  const api = `http://cal.syoboi.jp/json.php?Req=ProgramByCount&TID=${tid}&Count=${count}`;
  const json = await fetch(api).then((res) => res.json());
  const programs = Object.values(json.Programs || {})
    .filter(({ ProgComment }) => !/先行配信/.test(ProgComment))
    .sort((a, b) => a.StTime - b.StTime);
  return programs.length ? programs[0] : null;
}

/**
 * 获取番剧最早和最晚的集数
 * @param  {String} subTitles 分集标题信息
 * @return {Array}
 */
function getCount(subTitles) {
  const arr = (subTitles.match(/\*\d+\*/g) || [])
    .map((str) => str.match(/\d+/)[0] * 1);
  return arr.length ? [arr[0], arr.pop()] : [1, null];
}

function isFinished(item) {
  const now = new Date(Date.now() + 3.24e7).toISOString().slice(0, 7).replace('-', '') * 1;
  const end = (item.FirstEndYear * 100) + (item.FirstEndMonth * 1);
  return end && end < now;
}

/**
 * 获取放送时间
 * @param  {Object} metas 番剧 meta 数据对象
 * @param  {Number} type  为 0 或 1，代表 begin 或 end
 * @return {Promise}
 */
async function getDate(metas, type) {
  const programs = await metas
    .filter((meta) => !type || isFinished(meta))
    .reduce((sequence, meta, idx, arr) => sequence.then(async (ps) => {
      spinner.text = `[syoboi][${idx + 1}/${arr.length}]Fetching ${type ? 'end' : 'begin'} of ${meta.Title}`;
      await delay(800);
      const p = await getProgram(meta.TID, getCount(meta.SubTitles)[type]);
      return ps.concat(p);
    }), Promise.resolve([]))
    .then((ps) => ps.filter((p) => p));
  return metas.map((meta) => {
    const program = programs.find((p) => p.TID === meta.TID);
    const time = type ? 'EdTime' : 'StTime';
    if (program) {
      Object.assign(meta, { [time]: new Date(program[time] * 1000).toISOString() });
    }
    return meta;
  });
}

exports.getSeason = async function getSeason(season) {
  spinner.start('[syoboi][fetching]');
  const items = await getList(season)
    .then(getMetas)
    .then((metas) => getDate(metas, 0));
  spinner.succeed('[syoboi]');
  return items.map((item) => ({
    title: item.Title,
    titleTranslate: item.TitleEN ? { en: [item.TitleEN] } : {},
    type: '',
    lang: 'ja',
    officialSite: item.link || '',
    begin: item.StTime || '',
    broadcast: item.StTime ? `R/${item.StTime}/P7D` : '',
    end: '',
    comment: '',
    sites: [],
  }));
};

exports.getEnd = async function getEnd(title) {
  const api = `http://cal.syoboi.jp/json?Req=TitleSearch&Search=${encodeURIComponent(title)}&Limit=15`;
  const json = await fetch(api).then((res) => res.json());
  const item = Object.values(json.Titles || {})
    .find(({ Title, TitleEN }) => (
      Title.toLowerCase() === title.toLowerCase()
      || TitleEN.toLowerCase() === title.toLowerCase()
    ));
  if (!item) {
    throw new Error('NOT FOUND');
  }
  if (!isFinished(item)) {
    throw new Error('NOT FINISHED');
  }
  const [meta] = await getMetas([{ tid: item.TID }]);
  const program = await getProgram(meta.TID, getCount(meta.SubTitles)[1]);
  if (!program) {
    throw new Error('NOT FOUND');
  }
  return new Date(program.EdTime * 1000).toISOString();
};
