const { fetch } = require('../utils.js');

async function getBegin(id) {
  const url = `https://www.netflix.com/title/${id}`;
  const html = await fetch(url).then(res => res.text());
  const [, startTime] = html.match(/"availabilityStartTime":(\d+),/) || [];
  return { begin: startTime ? new Date(startTime * 1).toISOString() : '' };
}

exports.getInfo = async function getInfo(id) {
  try {
    const { begin } = await getBegin(id);
    return {
      begin,
      official: true,
      premuiumOnly: true,
      exist: null,
    };
  } catch (err) {
    console.log(err);
    return {};
  }
};
