const fetch = require('node-fetch');

async function getData(id) {
  const api = `http://api.movie.kankan.com/vodjs/moviedata/${id.slice(0, 2)}/${id}.js`;
  const text = await fetch(api).then(res => res.text());
  /* eslint-disable */
  eval(text.replace(/moviedata_\d+/g, 'data'));
  return {
    premuiumOnly: data.is_vip !== '0',
    exist: (data.moviedata.subtype || []).some(type => type === '1'),
  };
  /* eslint-enable */
}

exports.getInfo = async function getInfo(id) {
  try {
    const { premuiumOnly, exist } = await getData(id);
    return { premuiumOnly, exist };
  } catch (err) {
    console.log(err);
    return {};
  }
};
