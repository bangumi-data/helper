const youtube = require('./youtube.js');
const { matchBangumi } = require('../utils.js');

const channelUrl = 'https://www.youtube.com/c/AniOneAsia';
const channelId = 'UC0wNSTMWIL3qaorLx0jie6A';

const titleRegex = /《?\s*([^《》【]+)\s*》?/;
exports.getAll = async function getAll() {
  const parseTitle = (title) => {
    let delimiterIndex = title.indexOf('｜');
    if (delimiterIndex === -1) {
      delimiterIndex = title.indexOf('|');
    }

    if (delimiterIndex > -1) {
      let part1 = title.slice(0, delimiterIndex).trim();
      let part2 = title.slice(delimiterIndex + 1).trim();
      if (titleRegex.test(part1)) {
        part1 = part1.match(titleRegex)[1];
      }
      if (titleRegex.test(part2)) {
        part2 = part2.match(titleRegex)[1];
      }
      // 中英判斷
      if (/\p{sc=Han}/u.test(part1)) {
        // 《中文》|《英文》
        return {
          "zh-Hant": [part1],
          en: [part2],
        };
      } else {
        // 《英文》|《中文》
        return {
          "zh-Hant": [part2],
          en: [part1],
        };
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
