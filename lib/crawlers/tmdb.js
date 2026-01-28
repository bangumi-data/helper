const { fetch, matchBangumi } = require('../utils.js');

const api = 'https://api.themoviedb.org/3';
const language = 'ja-JP';
exports.tmdb_regex = tmdb_regex = /(tv|movie)\/(\d+)(?:\/season\/(\d+)(?:\/episode\/(\d+))?)?/;

// from https://github.com/rickylawson/freekeys
const tmdb_keys = [
  'fb7bb23f03b6994dafc674c074d01761',
  'e55425032d3d0f371fc776f302e7c09b',
  '8301a21598f8b45668d5711a814f01f6',
  '8cf43ad9c085135b9479ad5cf6bbcbda',
  'da63548086e399ffc910fbc08526df05',
  '13e53ff644a8bd4ba37b3e1044ad24f3',
  '269890f657dddf4635473cf4cf456576',
  'a2f888b27315e62e471b2d587048f32e',
  '8476a7ab80ad76f0936744df0430e67c',
  '5622cafbfe8f8cfe358a29c53e19bba0',
  'ae4bd1b6fce2a5648671bfc171d15ba4',
  '257654f35e3dff105574f97fb4b97035',
  '2f4038e83265214a0dcd6ec2eb3276f5',
  '9e43f45f94705cc8e1d5a0400d19a7b7',
  'af6887753365e14160254ac7f4345dd2',
  '06f10fc8741a672af455421c239a1ffc',
  'fb7bb23f03b6994dafc674c074d01761',
  '09ad8ace66eec34302943272db0e8d2c'
];

const getTmdbKey = () => {
  return tmdb_keys[Math.floor(Math.random() * tmdb_keys.length)];
}

async function fetchTmdb(url) {
  const response = await fetch(`${api}/${url}?api_key=${getTmdbKey()}&language=${language}`);
  if (response.ok) {
    return response.json();
  } else {
    const json = await response.json();
    if (json.status_message) {
      throw new Error(json.status_message);
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
    return fetchTmdb(url);
  }
}

/**
 * @returns yyyy-mm-dd
 */
exports.getBeginById = async function getByTmdbId(id) {
  const regexResult = tmdb_regex.exec(id);
  const tmdbType = regexResult[1];
  const tmdbId = regexResult[2];
  const seasonNum = regexResult[3];
  const episodeNum = regexResult[4];

  if (tmdbType !== 'movie' && tmdbType !== 'tv') {
    throw new Error('Invalid TMDB type');
  }

  const response = await fetchTmdb(`${tmdbType}/${tmdbId}`);
  if (tmdbType === 'movie'){
    return response.release_date;
  } else {
    let season = response.seasons.find((s) => s.season_number.toString() === (seasonNum ?? '1'));
    if (season) {
      if (episodeNum) {
        const seasonResponse = await fetchTmdb(`${tmdbType}/${tmdbId}/season/${seasonNum}`);
        const episode = seasonResponse.episodes.find((e) => e.episode_number.toString() === episodeNum);
        if (episode) {
          return episode.air_date;
        } else {
          throw new Error('Episode not found');
        }
      } else {
        return season.air_date;
      }
    } else {
      throw new Error('Season not found');
    }
  }
}
