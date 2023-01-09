const youtube = require('./youtube.js');

const channelUrl = 'https://www.youtube.com/c/AniOneAsia';
const channelId = 'UC0wNSTMWIL3qaorLx0jie6A';

exports.getAll = async function getAll() {
  return await youtube.getAll(channelId);
};

exports.getBegin = async function getBegin(id) {
  return await youtube.getBegin(id);
};
