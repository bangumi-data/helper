const fetch = require('node-fetch');

const { getAllBangumi } = require('../utils.js');

exports.getAll = async function getAll() {
  return getAllBangumi({
    api: page => `https://list.mgtv.com/50/a4-1277384--a6-----a7-2-${page}---.html`,
    total: $ => $('.w-pages ul li a')
      .map((i, el) => $(el).text())
      .get()
      .filter(x => /^\d+$/.test(x))
      .length,
    items: $ => $('.m-result-list-item')
      .map((i, el) => {
        const title = $(el).find('.u-title').text();
        const href = $(el).find('.u-title').attr('href');
        const [, id] = href.match(/\/b\/(\d+)\//);
        const img = $(el).find('.u-pic').attr('src');
        return { id, title, img };
      })
      .get(),
  });
};

/**
 * 获取放送时间与是否会员
 * @param  {String} cid 番剧 ID
 * @return {Object}     放送时间为文本，需之后手动处理
 */
async function getData(cid) {
  const api = `http://v.api.mgtv.com/list/tvlist?collection_id=${cid}`;
  const { status, msg, data } = await fetch(api).then(res => res.json());
  if (status !== 200) {
    throw new Error(msg);
  }
  return {
    begin: data.info.desc,
    premuiumOnly: Number(data.info.isvip) !== 0,
    exist: !!data.count,
  };
}

exports.getInfo = async function getInfo(id) {
  try {
    const { begin, premuiumOnly, exist } = await getData(id);
    return { begin, premuiumOnly, exist };
  } catch (err) {
    console.log(err);
    return {};
  }
};
