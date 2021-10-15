const youtube = require('./youtube.js');

const channelUrl = 'https://www.youtube.com/c/AniOneAsia';

exports.getAll = async function getAll() {
  return await youtube.getAll(channelUrl);
};

exports.getBegin = async function getBegin(id) {
  return await youtube.getBegin(id);
};
