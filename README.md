# Bangumi Data Helper

[![NPM version](https://img.shields.io/npm/v/bangumi-data-helper.svg)](https://www.npmjs.com/package/bangumi-data-helper)
[![License](https://img.shields.io/npm/l/bangumi-data-helper.svg)](https://github.com/bangumi-data/helper/blob/master/LICENSE)

简化 [Bangumi Data](https://github.com/bangumi-data/bangumi-data) 数据的维护工作。

## Installation

```bash
npm i bangumi-data-helper -g
```

## Usage

Bangumi Data Helper 是一个命令行工具，需要在 `bangumi-data` 项目目录下运行。

```bash
# 查看帮助
bdh --help
# 生成某一季度的初始数据
bdh create 2016q4
# 更新某一月份的番组数据
bdh update 201610
```

`bdh create <season>` 会根据 [cal.syoboi.jp](http://cal.syoboi.jp/) 的数据，创建指定季度的初始数据，包括日文标题、英文标题、官网、放送开始时间、放送结束时间、Bangumi.tv 对应条目；当一个季度的番组都完结后，可以再次运行该指令，会自动补上放送结束时间。

在添加维护放送站点信息时，可以在 `sites` 数组中添加包含 `site` 和 `id` 字段的对象，如 `{ "site": "iqiyi", "id": "a_19rrh9uqb5" }`，在当前文件修改完后，可以运行 `bdh update <month>`，该指令会把当前文件所有 `sites` 数组补充完整。注意，由于部分站点放送开始时间为无规律的中文，难以用程序解析，需要手动转换。

下表列举了当前自动化情况，✔ 表示可以自动获取，✖ 表示不能，✍ 表示需要手动修改。

| site     | begin | official | premuiumOnly |
| -------- | ----- | -------- | ------------ |
| acfun    | ✖     | ✖       | ✖            |
| bilibili | ✔     | ✔       | ✖            |
| iqiyi    | ✔     | ✖       | ✖            |
| kankan   | ✖     | ✖       | ✖            |
| letv     | ✖     | ✖       | ✖            |
| mgtv     | ✍     | ✖       | ✔            |
| pptv     | ✍     | ✖       | ✔            |
| sohu     | ✍     | ✖       | ✖            |
| qq       | ✍     | ✖       | ✖            |
| tudou    | ✔     | ✔       | ✔            |
| youku    | ✔     | ✔       | ✖            |
