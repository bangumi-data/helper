const { Client } = require('youtubei');

const youtube = new Client({'fetchOptions': {'headers': {'accept-language': 'zh-Hant;q=0.9'}}});

const regex = /(\d+)年(\d+)月(\d+)日/;
const regexHour = /(\d+)\s?小時前/;

exports.getAll = async function getAll(channelId) {
  const channel = await youtube.getChannel(channelId);
  if (!channel) {
    console.log('Channel not found');
  }

  let allPlaylists = await channel.playlists.next(0); // load all playlist

  return allPlaylists.map((item) => ({
    id: item.id,
    title: item.title,
    images: item.thumbnails[0].url,
  }));
};

exports.getBegin = async function getBegin(id) {
  const playlist = await youtube.getPlaylist(id);
  if (playlist.videoCount === 0) {
    return '';
  }

  const date = await Promise.all(playlist.videos.items.map(async (item) => {
    try {
      const video = await youtube.getVideo(item.id);
      if (video.uploadDate){
        if(regex.test(video.uploadDate)) {
          const matches = video.uploadDate.match(regex);
          return new Date(matches[1], matches[2] - 1, matches[3]);
        }
        if (regexHour.test(video.uploadDate)) {
          const matches = video.uploadDate.match(regexHour);
          let date = new Date();
          return date.setHours(date.getHours() - matches[1]);
        }
      }
      return undefined;
    } catch (error) {
      return undefined;
    }
  }))
    .then((dateList) => {
      return dateList.filter((date) => date != undefined)
        .reduce((lastValue, currentValue) => {
          if (currentValue === undefined) return lastValue;
          if (!lastValue) return currentValue;

          return lastValue > currentValue ? lastValue : currentValue;
        });
    });

  if (date != undefined) {
    return date.toISOString();
  } else {
    return '';
  }
};
