const youtube = require('./youtube.js');
const { matchBangumi } = require('../utils.js');

const channelUrl = 'https://www.youtube.com/c/AniOneAsia';
const channelId = 'UC0wNSTMWIL3qaorLx0jie6A';

exports.getAll = async function getAll() {
  const parseTitle = (title) => {
    const found = /《\s*(.+)\s*》\|\s*《\s*(.+)\s*》/.exec(title);
    if (found) {
      // 中英判斷
      if (/\p{sc=Han}/u.test(found[1])) {  // 《中文》|《英文》
        return {
          'zh-Hant': [found[1]],
          'en': [found[2]]
        }
      } else {  // 《英文》|《中文》
        return {
          'zh-Hant': [found[2]],
          'en': [found[1]]
        }
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

exports.getIsBangumiOffline = async (id) => {
  return await youtube.getIsBangumiOffline(id);
}
