const { Client } = require('youtubei');
const { fetch } = require('../utils.js');
const cheerio = require('cheerio');

const youtube = new Client({ 'fetchOptions': { 'headers': { 'accept-language': 'zh-Hant;q=0.9' } } });

exports.getAll = async function getAll(channelId, parseTitle) {
  const channel = await youtube.getChannel(channelId);
  if (!channel) {
    console.log('Channel not found');
  }

  let allPlaylists = await channel.playlists.next(0); // load all playlist

  let items = allPlaylists.map((item) => ({
    id: item.id,
    titleTranslate: parseTitle(item.title),
    images: item.thumbnails[0].url,
  }));

  // [START] temp fix for youtubei cannot get first page of playlist
  const $ = await fetch(`https://www.youtube.com/channel/${channelId}/playlists`,
    {
      headers: new Headers({ "accept-language": "zh-Hant;q=0.9" }),
    }
  )
    .then((res) => res.text())
    .then(cheerio.load);

  const searchString = "var ytInitialData =";
  $("script").each((i, e) => {
    const text = $(e).text();
    if (text.startsWith(searchString)) {
      const data = JSON.parse(text.slice(searchString.length, text.lastIndexOf('}') + 1));
      for (const tab of data.contents.twoColumnBrowseResultsRenderer.tabs) {
        if (tab.tabRenderer && tab.tabRenderer.title === "播放清單") {
          for (const item of tab.tabRenderer.content.sectionListRenderer.contents[0].itemSectionRenderer.contents[0].gridRenderer.items) {
            if (item.lockupViewModel){
              items.push({
                id: item.lockupViewModel.contentId,
                titleTranslate: parseTitle(
                  item.lockupViewModel.metadata.lockupMetadataViewModel.title.content
                ),
              });
            }
          }
        }
      }
    }
  });
  // [END] temp fix for youtubei cannot get first page of playlist

  return items;
};

exports.getBegin = async function getBegin(id) {
  const playlist = await youtube.getPlaylist(id);
  if (playlist.videoCount === 0) {
    return '';
  }

  const date = await Promise.all(playlist.videos.items.map(async (item) => {
    const url = `https://www.youtube.com/watch?v=${item.id}`;
    const $ = await fetch(url)
      .then((res) => res.text())
      .then(cheerio.load);
      return new Date($('meta[itemprop="startDate"]').prop('content'));
  }))
    .then((dateList) => {
      return dateList.reduce((lastValue, currentValue) => {
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

exports.getIsBangumiOffline = async (id) => {
  const playlist = await youtube.getPlaylist(id);
  if (playlist === undefined) {
    return true;
  } else {
    return playlist.videoCount === 0;
  }
}
