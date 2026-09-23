const { Innertube, Log } = require('youtubei.js');
Log.setLevel(Log.Level.ERROR);
const regex = /\d+/;
const limitedRegex = /(Limited-Time|限時|期間限定)/;

async function getYoutubeClient() {
  return await Innertube.create({ lang: 'zh-Hant' });
}

async function parseShows(shows, parseTitle) {
  const items = [];
  for (const show of shows) {
    const title = show.title.toString();
    if (limitedRegex.test(title)) {
      continue;
    }
    let titleTranslate = parseTitle(title);
    const playlistId = show.endpoint.payload.browseId.startsWith("VL") ? show.endpoint.payload.browseId.substr(2) : show.endpoint.payload.browseId;
    const seasonCount = parseInt(show.thumbnail_overlays[0].text.runs[0]);
    if (seasonCount > 1) {
      for (const [key, value] of Object.entries(titleTranslate)) {
        value[0] = value[0] + "(共" + seasonCount + "季)";
      }
    }
    
    items.push({
      id: playlistId,
      url: "https://www.youtube.com" + decodeURI(show.endpoint.metadata.url),
      titleTranslate,
      images: show.thumbnail_renderer.thumbnail[0].url,
    });
  }
  return items;
}

function parsePlaylists(playlists, parseTitle) {
  const items = [];
  for (const playlist of playlists) {
    const title = playlist.metadata.title.toString();
    if (limitedRegex.test(title)) {
      continue;
    }
    let titleTranslate = parseTitle(title);
    const isShow = playlist.content_image.primary_thumbnail.overlays[0].badges[0].icon_name === 'TV';
    const overlayText = playlist.content_image.primary_thumbnail.overlays[0].badges[0].text;
    if (isShow && (overlayText.includes("季") || overlayText.includes("season"))) {
      const seasonCount = overlayText.match(/(\d+)/)[1];
      for (const [key, value] of Object.entries(titleTranslate)) {
        value[0] = value[0] + "(共" + seasonCount + "季)";
      }
    }

    items.push({
      id: playlist.content_id,
      url: isShow ? "https://www.youtube.com" + decodeURI(playlist.renderer_context.command_context.on_tap.metadata.url) : undefined,
      titleTranslate,
      images: playlist.content_image.primary_thumbnail.image[0].url,
    });
  }
  return items;
}

exports.getAll = async function getAll(channelId, parseTitle) {
  let items = [];
  const innertube = await getYoutubeClient();
  const channel = await innertube.getChannel(channelId);

  if (channel.has_shows) {
    /* let shows = await channel.getShows();
    items = items.concat(await parseShows(shows.playlists, parseTitle));
    while (shows.has_continuation) {
      shows = await shows.getContinuation();
      items = items.concat(await parseShows(shows.playlists, parseTitle));
    } */
  }

  const showIds = items.map(show => show.id);
  let playlists = await channel.getPlaylists();
  items = items.concat(parsePlaylists(playlists.playlists, parseTitle).filter((playlist) => !showIds.includes(playlist.id)));
  while (playlists.has_continuation) {
    playlists = await playlists.getContinuation();
    items = items.concat(parsePlaylists(playlists.playlists, parseTitle));
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
      dateList.push(await getDateFromId(innertube, item.content_id, item.metadata.title.text));
  }
  while (playlist.has_continuation) {
    playlist = await playlist.getContinuation();
    for (const item of playlist.items) {
      dateList.push(await getDateFromId(innertube, item.content_id, item.title.text));
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
