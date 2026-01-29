const offlineDb = require('./offline_db.js');
const { matchBangumi } = require('../utils.js');

exports.getAll = async function getAll() {
  return await offlineDb.getAll('anidb');
};

exports.matchBangumi = async (input, items) => {
  return matchBangumi(input, {
    items,
    matchBegin: offlineDb.matchBegin,
    mergeTitleTranslate: false,
    // matchMyanimelistId: true,
  });
}
