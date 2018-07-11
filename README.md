# Bangumi Data Helper

[![Node version](https://img.shields.io/badge/node-%3E%3D%208.0.0-blue.svg)](https://nodejs.org)
[![NPM version](https://img.shields.io/npm/v/bangumi-data-helper.svg)](https://www.npmjs.com/package/bangumi-data-helper)
[![License](https://img.shields.io/npm/l/bangumi-data-helper.svg)](https://github.com/bangumi-data/helper/blob/master/LICENSE)

Bangumi Data Helper 是一个命令行辅助工具，用于简化 [Bangumi Data](https://github.com/bangumi-data/bangumi-data) 数据的维护工作。bdh 可以完成大多数的重复性工作，但由于各个站点各个信息的不确定因素较多，爬取到的结果还需人工审核一遍。

## Installation

```bash
npm i -g bangumi-data-helper

# 对于 bangumi-data@0.1 版本请安装 bangumi-data-helper@0.0
```

## Usage

需要在 `bangumi-data` 项目目录下运行。

```bash
# 查看帮助
bdh --help
# 生成某一季度的初始数据
bdh create 2016q4
# 更新某一月份的番组数据
bdh update 201610
```

`bdh create <season>` 会根据 [cal.syoboi.jp](http://cal.syoboi.jp/) 的数据，创建指定季度的初始数据，包括日文标题、英文标题、官网、放送开始时间、放送结束时间、番剧类型、Bangumi.tv 对应条目。当一个季度的番组都完结后（下一季度的第一天），可以再次运行该指令，会自动补上放送结束时间。有些番组不包含放送开始时间，这些数据会被放入 `data/items/0000/00.json` 待人工处理。

在添加维护放送站点信息时，可以在 `sites` 数组中添加[番剧页面链接](https://github.com/bangumi-data/bangumi-data/blob/master/CONTRIBUTING.md#%E7%AB%99%E7%82%B9-url-%E6%8B%BC%E6%8E%A5)或包含 `site` 和 `id` 信息的对象，例如：

```js
{
  // ...
  "sites": [
    "http://www.iqiyi.com/a_19rrh9uqb5.html",
    // 或者
    {
      "site": "iqiyi",
      "id": "a_19rrh9uqb5"
    }
  ]
}
```

其中 Bilibili 支持 `https://bangumi.bilibili.com/anime/24572` 和 `https://www.bilibili.com/bangumi/media/md103032` 两种格式。

在当前文件修改完后，可以运行 `bdh update <month>`，该指令会把当前文件所有番剧的 `sites` 数组处理成符合规范的格式。注意，由于部分站点放送开始时间为无规律的中文，难以用程序解析，需要手动转换。

下表列举了当前自动化情况，✔ 表示可以自动获取，✖ 表示不能，✍ 表示需要手动修改。

| site      | begin | official | premuiumOnly | censored | exist |
| --------- | ----- | -------- | ------------ | -------- | ----- |
| acfun     | ✖    | ✖       | ✖           | ✖       | ✔    |
| bilibili  | ✔    | ✔       | ✔           | ✖       | ✔    |
| iqiyi     | ✔    | ✔(true) | ✔           | ✖       | ✔    |
| kankan    | ✖    | ✖       | ✔           | ✖       | ✔    |
| letv      | ✖    | ✖       | ✔           | ✖       | ✔    |
| mgtv      | ✍     | ✖       | ✔           | ✖      | ✔    |
| netflix   | ✔    | ✔(true) | ✔(true)     | ✖       | ✖    |
| nicovideo | ✔    | ✔(true) | ✔(true)     | ✖       | ✔    |
| pptv      | ✍     | ✔       | ✔           | ✖      | ✔    |
| qq        | ✍     | ✖       | ✔           | ✖      | ✔    |
| sohu      | ✍     | ✔(true) | ✔           | ✖      | ✔    |
| youku     | ✔    | ✔       | ✔           | ✖       | ✔    |
