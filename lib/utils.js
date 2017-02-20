const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');

/**
 * ES7 Object.values()
 * @param  {Object} obj Plain Object
 * @return {Array}
 */
function objectValues(obj) {
  const arr = [];
  for (const key in obj) {
    arr.push(obj[key]);
  }
  return arr;
}

/**
 * 合并两个番剧对象数组
 * @param  {Array}  targets            目标数组
 * @param  {Array}  sources            源数组
 * @param  {String}  identifier        对象识别值
 * @param  {Boolean} [overwrite=false] 是否覆写目标对象
 * @return {Array}
 */
function merge(targets, sources, identifier, overwrite = false) {
  sources.forEach((source) => {
    const target = targets.find(t => (
      identifier === null ? t === source : t[identifier] === source[identifier]
    ));
    if (!target) {
      targets.push(source);
      return;
    }
    for (const key in source) {
      if (key === 'titleTranslate') {
        for (const lang in source[key]) {
          target[key][lang] = merge(
            target[key][lang] || [],
            source[key][lang],
            null,
            overwrite
          );
        }
      } else if (key === 'sites') {
        target[key] = merge(target[key], source[key], 'site', overwrite);
      } else {
        if (source[key] === '' || (target[key] !== '' && !overwrite)) {
          continue;
        }
        target[key] = source[key];
      }
    }
  });
  return targets;
}

function readJSON(jsonPath) {
  return new Promise((resolve, reject) => {
    fs.readFile(jsonPath, 'utf-8', (err, data) => {
      if (err) reject(err);
      try {
        resolve(JSON.parse(data));
      } catch (e) {
        reject(e);
      }
    });
  })
  .catch(() => []);
}

function writeJSON(jsonPath, data) {
  return new Promise((resolve, reject) => {
    mkdirp.sync(path.dirname(jsonPath));
    const formated = `${JSON.stringify(data, null, 2)}\n`;
    fs.writeFile(jsonPath, formated, 'utf-8', (err) => {
      if (err) reject(err);
      resolve(data);
    });
  })
  .catch(() => []);
}

/**
 * 将番剧对象数组转换为按年月分类的对象
 * @param  {Array} items 番剧数组
 * @return {Object}
 */
function classify(items) {
  const data = {};
  items.forEach((item) => {
    // 对于无放送开始时间的番组，将其保存到 `./0000/00.json` 手动处理
    const begin = item.begin || '0000-00';
    const year = begin.slice(0, 4);
    const month = begin.slice(5, 7);
    data[year] = data[year] || {};
    data[year][month] = data[year][month] || [];
    data[year][month].push(item);
  });
  return data;
}

function delay(time) {
  return new Promise((resolve) => {
    setTimeout(resolve, time);
  });
}

function timeout(time) {
  return new Promise((resolve, reject) => {
    setTimeout(() => reject(new Error('operation timed out')), time);
  });
}

module.exports = {
  objectValues,
  merge,
  readJSON,
  writeJSON,
  classify,
  delay,
  timeout,
};
