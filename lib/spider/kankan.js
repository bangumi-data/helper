const fetch = require('node-fetch');

function getInfo(id) {
  const api = `http://api.movie.kankan.com/vodjs/moviedata/${id.slice(0, 2)}/${id}.js`;
  return fetch(api)
    .then(res => res.text())
    .then((text) => {
      /* eslint-disable */
      eval(text.replace(/moviedata_\d+/g, 'data'));
      return {
        premuiumOnly: data.is_vip !== '0',
        exist: (data.moviedata.subtype || []).some(type => type === '1'),
      };
      /* eslint-enable */
    });
}

module.exports = async (id) => {
  let info = {};
  try {
    info = await getInfo(id);
  } catch (e) {
    console.log(e);
  }
  return Object.assign({ site: 'kankan', id }, info);
};
