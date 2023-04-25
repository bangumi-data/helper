const youtube = require('./youtube.js');
const { matchBangumi } = require('../utils.js');

const channelUrl = 'https://www.youtube.com/c/AniOneAsia';
const channelId = 'UC0wNSTMWIL3qaorLx0jie6A';

exports.getAll = async function getAll() {
  const parseTitle = (title) => {
    const found = /^《(.+)》\|《(.+)》$/.exec(title);
    if (found) {
      return {
        'zh-Hant': [found[1]],
        'en': [found[2]]
      }
    }
    return { 'zh-Hant': [title] };
  }
  return await youtube.getAll(channelId, parseTitle);
};

exports.getBegin = async function getBegin(id) {
  return await youtube.getBegin(id);
};

exports.matchBangumi = async (input, items) => {
  return matchBangumi(input, { items });
}
