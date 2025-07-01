const { Innertube, Log } = require('youtubei.js');
Log.setLevel(Log.Level.ERROR);
const regex = /\d+/;

async function getYoutubeClient() {
  return await Innertube.create({ lang: 'zh-Hant' });
}

exports.getAll = async function getAll(channelId, parseTitle) {
  let items = [];
  const innertube = await getYoutubeClient();
  const channel = await innertube.getChannel(channelId);
  let playlists = await channel.getPlaylists();
  for (const playlist of playlists.playlists) {
    items.push({
      id: playlist.content_id,
      titleTranslate: parseTitle(playlist.metadata.title.toString()),
      images: playlist.content_image.primary_thumbnail.image[0].url,
    });
  }
  while (playlists.has_continuation) {
    playlists = await playlists.getContinuation();
    for (const playlist of playlists.playlists) {
      items.push({
        id: playlist.id,
        titleTranslate: parseTitle(playlist.title.toString()),
        images: playlist.thumbnails[0].url,
      });
    }
  }
  return items;
};

exports.getBegin = async function getBegin(id) {
  const innertube = await getYoutubeClient();
  let playlist = await innertube.getPlaylist(id);
  const totalVideo = playlist.info.total_items.match(regex) !== null ? playlist.info.total_items.match(regex)[0] : 0;
  if (totalVideo === 0) {
    return '';
  }

  let dateList = [];
  for (const item of playlist.items) {
      dateList.push(await getDateFromId(innertube, item.id, item.title.text));
  }
  while (playlist.has_continuation) {
    playlist = await playlist.getContinuation();
    for (const item of playlist.items) {
      dateList.push(await getDateFromId(innertube, item.id, item.title.text));
    }
  }

  const date = dateList.reduce((lastValue, currentValue) => {
    if (currentValue === undefined) return lastValue;
    if (!lastValue) return currentValue;
    return lastValue < currentValue ? lastValue : currentValue;
  });

  if (date != undefined) {
    return date.toISOString();
  } else {
    return '';
  }
};

async function getDateFromId(innertube, id, title) {
    if (title.includes('PV')) {
      return null;
    }
    const video = await innertube.getInfo(id);
    return video.basic_info.start_timestamp;
}

exports.getIsBangumiOffline = async (id) => {
  try{
    const innertube = await getYoutubeClient();
    const playlist = await innertube.getPlaylist(id);
    const totalVideo = playlist.info.total_items.match(regex) !== null ? playlist.info.total_items.match(regex)[0] : 0;
    return totalVideo === 0;
  } catch (e) {
    return true;
  }
}
