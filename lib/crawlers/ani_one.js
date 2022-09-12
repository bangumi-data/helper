const youtube = require('./youtube.js');

const channelUrl = 'https://www.youtube.com/c/AniOneAnime';
const channelId = 'UC45ONEZZfMDZCnEhgYmVu-A';

exports.getAll = async function getAll() {
  return await youtube.getAll(channelId);
};

exports.getBegin = async function getBegin(id) {
  return await youtube.getBegin(id);
};
