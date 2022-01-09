const youtube = require('./youtube.js');

const channelUrl = 'https://www.youtube.com/c/Muse%E6%9C%A8%E6%A3%89%E8%8A%B1HK';

exports.getAll = async function getAll() {
  await youtube.getAll(channelUrl);
};

exports.getBegin = async function getBegin(id) {
  await youtube.getBegin(id);
};
