const cheerio = require('cheerio');
const ora = require('ora');

const { fetch, getAllBangumi } = require('../utils.js');

function matchId(href) {
  const [, id = ''] = href.match(/sohu\.com\/(s\d{4}\/\w+)/) || [];
  return id;
}

async function correctId({ href, title }) {
  const spinner = ora(`Correcting ID of ${title}`).start();
  let $ = await fetch(href.startsWith('//') ? `https:${href}` : href)
    .then(res => res.text())
    .then(cheerio.load);
  const pv = $('.btn-playPre').attr('href');
  if (!pv) {
    spinner.stop();
    return '';
  }
  $ = await fetch(pv.startsWith('//') ? `https:${pv}` : pv)
    .then(res => res.text())
    .then(cheerio.load);
  spinner.stop();
  const category = $('.crumbs a').first().attr('href');
  const albumPage = $('.crumbs a').last().attr('href');
  return /com\/comic/.test(category) ? matchId(albumPage) : '';
}

exports.getAll = async function getAll() {
  const items = await getAllBangumi({
    api: page => `https://so.tv.sohu.com/list_p1115_p2_p31004_p4_p5_p6_p73_p8_p9_p10${page}_p11_p12_p13.html`,
    total: $ => $('.ssPages')
      .children()
      .filter((i, el) => /^\d+$/.test($(el).text()))
      .last()
      .text() * 1,
    items: $ => $('.st-list li')
      .map((i, el) => {
        const title = $(el).find('strong a').text();
        const href = $(el).find('strong a').attr('href');
        const id = matchId(href);
        const img = $(el).find('.st-pic img').attr('src');
        return { id, title, img, href };
      })
      .get(),
  });
  await items.reduce((sequence, item) => sequence.then(async () => {
    if (!item.id) {
      const id = await correctId(item);
      Object.assign(item, { id });
    }
  }), Promise.resolve());
  return items.filter(({ id }) => id);
};

/**
 * 获取 Playlist ID
 * @param  {Number} id 番剧 ID
 * @return {String}    Playlist ID
 */
async function getPlaylistId(id) {
  const url = `http://tv.sohu.com/${id}`;
  const text = await fetch(url).then(res => res.text());
  const pid = text.match(/var\s+PLAYLIST_ID="(\d+)";/);
  if (!pid) {
    throw new Error('404 Not Found');
  }
  return pid[1];
}

/**
 * 获取放送时间和是否付费
 * @param  {Number} playlistId Playlist ID
 * @return {Object}            放送时间为文本，需之后手动处理
 */
async function getData(playlistId) {
  const api = `http://pl.hd.sohu.com/videolist?playlistid=${playlistId}`;
  const json = await fetch(api).then(res => res.json());
  return {
    begin: json.updateNotification,
    premuiumOnly: json.videos.some(video => video.tvIsFee !== 0),
    exist: json.totalSet > 0,
  };
}

exports.getInfo = async function getInfo(id) {
  try {
    const playlistId = await getPlaylistId(id);
    const { begin, premuiumOnly, exist } = await getData(playlistId);
    return {
      begin,
      official: true,
      premuiumOnly,
      exist,
    };
  } catch (err) {
    console.log(err);
    return {};
  }
};
