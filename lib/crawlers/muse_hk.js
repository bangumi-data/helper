const youtube = require('./youtube.js');

const channelUrl = 'https://www.youtube.com/c/Muse%E6%9C%A8%E6%A3%89%E8%8A%B1HK';

exports.getAll = async function getAll() {
  return await youtube.getAll(channelUrl);
};

exports.getBegin = async function getBegin(id) {
  return await youtube.getBegin(id);
};
