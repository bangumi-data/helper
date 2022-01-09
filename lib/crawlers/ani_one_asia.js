const youtube = require('./youtube.js');

const channelUrl = 'https://www.youtube.com/c/AniOneAsia';

exports.getAll = async function getAll() {
  await youtube.getAll(channelUrl);
};

exports.getBegin = async function getBegin(id) {
  await youtube.getBegin(id);
};
