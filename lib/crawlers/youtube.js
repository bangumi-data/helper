const cheerio = require('cheerio');
const { Client } = require("youtubei");
const { fetch } = require('../utils.js');
const youtube = new Client();

const regex = /(\d+)年(\d+)月(\d+)日/;

exports.getAll = async function getAll(channelName) {
  const searchResult = await youtube.search(channelName, {"type": "channel"});
  if (!searchResult){
    console.log("Channel not found");
  }
  const channelId = searchResult[0].id;

  const channel = await youtube.getChannel(channelId);
  await channel.nextPlaylists(0); // load all playlist

  return channel.playlists.map((item) => ({
    id: item.id,
    title: item.title,
    images: item.thumbnails[0].url
  }));
};

exports.getBegin = async function getBegin(id) {
  const playlist = await youtube.getPlaylist(id);
  if (playlist.videoCount == 0) {
    return '';
  }

  const dateList = await Promise.all(playlist.videos.map(async (item) => {
      const video = await youtube.getVideo(item.id);
      if(video.uploadDate && regex.test(video.uploadDate)){
        const matches = video.uploadDate.match(regex);
        return new Date(matches[1], matches[2] - 1, matches[3]);
      } else {
        return undefined;
      }
  }));

  const date = dateList.reduce((lastValue, currentValue) => {
    if(currentValue == undefined)
      return lastValue;
    else if (!lastValue)
      return currentValue;
    else {
      return lastValue < currentValue ? lastValue : currentValue;
    }
  });
  return date.toISOString();
};
