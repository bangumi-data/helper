const fetch = require('node-fetch');

function getBegin(id) {
  const url = `https://www.netflix.com/title/${id}`;
  return fetch(url)
    .then(res => res.text())
    .then((html) => {
      const [, startTime] = html.match(/"availabilityStartTime":(\d+),/) || [];
      return { begin: startTime ? new Date(startTime * 1).toISOString() : '' };
    });
}

module.exports = async (id) => {
  let info = {};
  try {
    const { begin } = await getBegin(id);
    info = {
      begin,
      official: true,
      premuiumOnly: true,
      exist: null,
    };
  } catch (e) {
    console.log(e);
  }
  return Object.assign({ site: 'netflix', id }, info);
};
