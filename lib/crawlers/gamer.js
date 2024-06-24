const gamerCommon = require('./gamer_common.js');

exports.getAll = async function getAll() {
    return await gamerCommon.getAllBangumi('TW', 1);
};

exports.getBegin = async function getBegin(id) {
    return gamerCommon.getBegin(id);
};

exports.matchBangumi = async function matchBangumi(input, items) {
    return gamerCommon.matchBangumi(input, items);
};

exports.getIsBangumiOffline = async (id) => {
    return gamerCommon.getIsBangumiOffline(id);
}
