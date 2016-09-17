const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');

const utils = module.exports;

/**
 * ES7 Object.values()
 * @param  {Object} obj Plain Object
 * @return {Array}
 */
utils.objectValues = function(obj) {
  const arr = [];
  for (const key in obj) {
    arr.push(obj[key]);
  }
  return arr;
};

/**
 * 合并两个番剧对象数组
 * @param  {Array}  targets            目标数组
 * @param  {Array}  sources            源数组
 * @param  {String}  identifier        对象识别值
 * @param  {Boolean} [overwrite=false] 是否覆写目标对象
 * @return {Array}
 */
utils.merge = function(targets, sources, identifier, overwrite = false) {
  sources.forEach(source => {
    const target = targets.find(t =>
      identifier === null ? t === source : t[identifier] === source[identifier]
    );
    if (!target) {
      targets.push(source);
      return;
    }
    for (const key in source) {
      if (key === 'titleTranslate') {
        for (const lang in source[key]) {
          target[key][lang] = utils.merge(
            target[key][lang] || [],
            source[key][lang],
            null,
            overwrite
          );
        }
      } else if (key === 'sites') {
        target[key] = utils.merge(target[key], source[key], 'site', overwrite);
      } else {
        if (target[key] !== '' && !overwrite) continue;
        target[key] = source[key];
      }
    }
  });
  return targets;
};

utils.readJSON = function(jsonPath) {
  return new Promise(function(resolve, reject) {
    fs.readFile(jsonPath, 'utf-8', (err, data) => {
      if (err) reject(err);
      try {
        resolve(JSON.parse(data));
      } catch (e) {
        reject(e);
      }
    });
  })
  .catch(err => []);
};

utils.writeJSON = function(jsonPath, data) {
  return new Promise(function(resolve, reject) {
    mkdirp.sync(path.dirname(jsonPath));
    const formated = JSON.stringify(data, null, 2);
    fs.writeFile(jsonPath, formated, 'utf-8', (err) => {
      if (err) reject(err);
      resolve(data);
    });
  })
  .catch(err => []);
};
