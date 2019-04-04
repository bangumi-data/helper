const { fetch, getAllBangumi } = require('../utils.js');

exports.getAll = async function getAll() {
  return getAllBangumi({
    api: page => `https://v.qq.com/x/list/cartoon?iarea=2&sort=19&offset=${(page - 1) * 30}`,
    total: $ => $('.mod_pages .page_num').last().text() * 1,
    items: $ => $('.list_item')
      .map((i, el) => {
        const title = $(el).find('.figure_title a').text();
        const href = $(el).find('.figure_title a').attr('href');
        const [, id] = href.match(/\/cover\/(\w+)\.html/);
        return { id: `${id[0]}/${id}`, title };
      })
      .get()
      // fuck you tencent video
      .filter(({ id }) => !id.startsWith('s/sdp001')),
  });
};

/**
 * 获取放送时间
 * @param  {Number} id 番剧 ID
 * @return {String}     放送时间为文本，需之后手动处理
 */
async function getBegin(id) {
  const api = `https://ncgi.video.qq.com/fcgi-bin/liveportal/follow_info?otype=json&t=1&id=${id}`;
  const json = await fetch(api)
    .then(res => res.text())
    .then(text => JSON.parse(text.match(/QZOutputJson=(.*);$/)[1]));
  return { begin: json.follow[0].followdesc };
}

/**
 * 获取是否付费
 * @param  {String} id 番剧 ID
 * @return {Boolean}   是否付费
 */
async function getPremuiumOnly(id) {
  const api = `https://s.video.qq.com/loadplaylist?type=6&id=${id}&plname=qq&otype=json`;
  const json = await fetch(api)
    .then(res => res.text())
    .then(text => JSON.parse(text.match(/QZOutputJson=(.*);$/)[1]));
  return {
    premuiumOnly: json.video_play_list.pay_type === '2',
    exist: json.video_play_list.cnt > 0,
  };
}

exports.getInfo = async function getInfo(rawId) {
  try {
    const id = rawId.replace(/^\w\//, '');
    const { begin } = await getBegin(id);
    const { premuiumOnly, exist } = await getPremuiumOnly(id);
    return {
      begin,
      premuiumOnly,
      exist,
    };
  } catch (err) {
    console.log(err);
    return {};
  }
};
