const youtube = require('./youtube.js');
const emojiRegex = require('emoji-regex');
const { matchBangumi } = require('../utils.js');

const channelUrl = 'https://www.youtube.com/c/Muse%E6%9C%A8%E6%A3%89%E8%8A%B1HK';
const channelId = 'UCOsFUU8EtJGDd6-AouF_MwQ';

exports.getAll = async function getAll() {
  const parseTitle = (title) => {
    const found = /(.*)\s?\|\s?(?:Muse)?(?:木棉花)?/.exec(title);
    if (found) {
      return {
        'zh-Hant': [`${found[1]}`.replace(emojiRegex(), '').trim()],
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
