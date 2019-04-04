const ora = require('ora');

const { fetch } = require('../utils.js');

exports._getAll = async function getAll(page = 1, total = 0) {
  const spinner = ora(`Crawling page ${page}/${total || '?'}`).start();
  const api = `http://www.acfun.cn/album/abm/bangumis/list?size=1000&num=${page}&sorter=1&asc=0`;
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

async function getExist(id) {
  const api = `http://www.acfun.cn/bangumi/video/page?bangumiId=${id}`;
  const { data } = await fetch(api).then(res => res.json());
  return { exist: !!data.totalCount };
}

exports.getInfo = async function getInfo(id) {
  try {
    const { exist } = await getExist(id);
    return { exist };
  } catch (err) {
    console.log(err);
    return {};
  }
};
