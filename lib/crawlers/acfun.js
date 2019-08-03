const ora = require('ora');

const { fetch } = require('../utils.js');

exports.getAll = async function getAll(page = 1, total = 0) {
  const spinner = ora(`Crawling page ${page}/${total || '?'}`).start();
  const api = `https://www.acfun.cn/album/abm/bangumis/list?size=1000&num=${page}&sorter=1&asc=0`;
  const { code, message, data } = await fetch(api).then(res => res.json());
  spinner.stop();
  if (!code && message) {
    throw new Error(message);
  }
  const items = data.content
    .filter(x => x.channelAName === '动画')
    .map(({ id, title, coverImageV }) => ({ id, title, img: coverImageV }));
  if (page < data.totalPage) {
    return items.concat(await getAll(page + 1, data.totalPage));
  }
  return items;
};

exports.getBegin = async function getBegin(id) {
  const api = `https://www.acfun.cn/album/abm/bangumis/video?albumId=${id}&num=1&size=20`;
  const { data } = await fetch(api).then(res => res.json());
  if (!data.content.length) return '';
  const part = data.content
    .sort((a, b) => a.sort - b.sort)
    .shift();
  if (!part) return '';
  const video = part.videos
    .sort((a, b) => a.onlineTime - b.onlineTime)
    .shift();
  return video ? new Date(video.onlineTime).toISOString() : '';
};
