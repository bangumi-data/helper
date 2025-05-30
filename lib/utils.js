const cheerio = require('cheerio');
const fetch = require('node-fetch');
const HttpsProxyAgent = require('https-proxy-agent');
const ora = require('ora');
const klaw = require('klaw');
const path = require('path');
const fs = require('fs-extra');
const OpenCC = require('opencc-js');
const converterZhHantToZhHans = OpenCC.Converter({ from: 'tw', to: 'cn' });

function withProxy(originFetch) {
  return (url, options) => originFetch(
    url,
    Object.assign(
      process.env.HTTP_PROXY
        ? { agent: new HttpsProxyAgent(process.env.HTTP_PROXY) }
        : {},
      options,
    ),
  );
}

exports.fetch = withProxy(fetch);

/**
 * 合并两个番剧对象数组
 * @param  {Array}  targets            目标数组
 * @param  {Array}  sources            源数组
 * @param  {String}  identifier        对象识别值
 * @param  {Boolean} [overwrite=false] 是否覆写目标对象
 * @return {Array}
 */
exports.merge = function merge(targets, sources, identifier, overwrite = false) {
  sources.forEach((source) => {
    const target = targets.find((t) => (
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
            overwrite,
          );
        }
      } else if (key === 'sites') {
        target[key] = merge(target[key], source[key], 'site', overwrite);
      } else {
        if (
          source[key] === ''
          || source[key] === null
          || (target[key] !== '' && target[key] !== null && !overwrite)
        ) {
          continue;
        }
        target[key] = source[key];
      }
    }
  });
  return targets;
};

/**
 * 将番剧对象数组转换为按年月分类的对象
 * @param  {Array} items 番剧数组
 * @return {Object}
 */
exports.classify = function classify(items) {
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
};

exports.delay = function delay(time) {
  return new Promise((resolve) => {
    setTimeout(resolve, time);
  });
};

exports.timeout = function timeout(time) {
  return new Promise((resolve, reject) => {
    setTimeout(() => reject(new Error('operation timed out')), time);
  });
};

exports.getAllBangumi = async function getAllBangumi(gen, page = 1, total = 0) {
  const spinner = ora(
    gen.message
      ? gen.message(page, total)
      : `Crawling page ${page}/${total || '?'}`,
  ).start();
  const api = gen.api(page);
  const $ = await withProxy(fetch)(api)
    .then((res) => res.text())
    .then(cheerio.load);
  spinner.stop();
  const totalPage = gen.total($, page);
  const items = gen.items($);
  if (page < totalPage) {
    return items.concat(await getAllBangumi(gen, page + 1, totalPage));
  }
  return items;
};

exports.walk = function walk(dir, filter) {
  return new Promise((resolve, reject) => {
    const items = [];
    klaw(dir)
      .on('data', (item) => {
        if (filter(item.path)) {
          items.push(item.path);
        }
      })
      .on('end', () => {
        resolve(items);
      })
      .on('error', reject);
  });
};

/**
 * 将番剧对象数组加入按年月分类的文件
 * @param  {String} input 数据输入目录
 * @param  {Array} options.items 番剧对象
 * @param  {Function} options.matchTitle 匹配番剧标题的方法
 * @return {Array} 需手动加入的番剧对象
 */
exports.matchBangumi = async function matchBangumi(input, options) {
  if (options.matchTitle == null) {
    options.matchTitle = (titles, title) => titles.some(t => {
      if (t === title) return true;  // 标题完全匹配
      let t2 = t.replace(/[\uff01-\uff5e]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0));
      let title2 = title.replace(/[\uff01-\uff5e]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0));
      if (t2 === title2) return true;  // 半角全角匹配
      t2 = t2.toLowerCase();
      title2 = title2.toLowerCase();
      if (t2 === title2) return true; // 大小写匹配
      t2 = converterZhHantToZhHans(t2);
      title2 = converterZhHantToZhHans(title2);
      if (t2 === title2) return true; // 繁简匹配
      t2 = t2.replace(/\s/g, '');
      title2 = title2.replace(/\s/g, '');
      if (t2 === title2) return true;  // 无空格匹配
      t2 = t2.replace(/[\(\)]/g, '');
      title2 = title2.replace(/[\(\)]/g, '');
      if (t2 === title2) return true;  // 无括号匹配
      return false;
    });
  }

  const files = await exports.walk(input, (item) => /\d\d\.json$/.test(item));
  const existingBangumi = await Promise.all(files.map(async file => {
    const result = await fs.readJson(file, 'utf-8');
    return { file, result };
  }));

  const todo = [];
  for (const item of options.items) {
    const titles = [];
    if (item.title) {
      titles.push(item.title);
    }
    if (item.titleTranslate) {
      Object.values(item.titleTranslate).forEach((titleTranslate) => titles.push(...titleTranslate));
    }
    const spinner = ora(`Matching bangumi: ${titles[0]}`).start();

    const fileToAdd = existingBangumi.map((localFile) => {
      let titleMatch = localFile.result.map((existingBangumi) => {
        // found existing record for site, skip matching
        if (existingBangumi.sites.some((site) => site.site === item.site)) {
          return null;
        }

        // match title
        let matchedTitle = null;
        const existingTitles = [existingBangumi.title];
        if (existingBangumi.titleTranslate) {
          Object.values(existingBangumi.titleTranslate).forEach((titleTranslate) => existingTitles.push(...titleTranslate));
        }
        for (const title of titles) {
          if (options.matchTitle(existingTitles, title)) {
            matchedTitle = existingBangumi.title;
          }
        }
        return matchedTitle;
      })
        .filter(value => value != null);

      return titleMatch.length === 1 ? {
        file: localFile.file,
        title: titleMatch[0],
      } : null;
    })
      .filter(value => value != null);

    if (fileToAdd.length === 1) {
      const matchedFile = fileToAdd[0].file;

      let siteForMerge = { site: item.site, id: item.id };
      if(item.url) {
        siteForMerge.url = item.url;
      }
      const objectForMerge = [{
        title: fileToAdd[0].title,
        titleTranslate: item.titleTranslate,
        sites: [siteForMerge],
      }];

      await Promise.resolve(fs.readJson(matchedFile))
        .catch(() => [])
        .then((origin) => exports.merge(origin, objectForMerge, 'title'))
        .then((merged) => fs.outputJson(matchedFile, merged, { spaces: 2 }))
        .catch(console.error);

      const found = /(\d{4})[\\\/](\d{2})\.json/.exec(matchedFile);
      const saveToFileName = `${found[1]}-${found[2]}`;
      spinner.succeed(`Matched. [${saveToFileName}] ${fileToAdd[0].title} 《${titles[0]}》`);
    } else {
      todo.push(item);
      spinner.stop();
    }
  }
  return todo;
}

/** 修复 autocomplete prompt 初次渲染时默认项不可见的问题 */
const AutocompletePrompt = require('inquirer-autocomplete-prompt');

// 保存原始的 search 方法
const originalSearch = AutocompletePrompt.prototype.search;

// 重写 search 方法
AutocompletePrompt.prototype.search = function (searchTerm) {
  const searchPromise = originalSearch.call(this, searchTerm);

  // 仅在首次渲染时进行额外处理
  if (this.firstRender) {
    searchPromise.then(() => {
      this.firstRender = false;
      const originalInfinite = this.paginator.isInfinite;
      this.paginator.isInfinite = false; // 暂时使用有限分页，使默认项居中显示
      this.render();
      this.paginator.isInfinite = originalInfinite;
    });
  }
  return searchPromise;
};
exports.AutocompletePrompt = AutocompletePrompt;