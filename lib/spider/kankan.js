const DEFAULT_INFO = {
  site: 'kankan',
  id: '',
  begin: '',
  official: false,
  premuiumOnly: false,
  censored: false,
  lang: 'zh-Hans',
  comment: '',
};

module.exports = id =>
  Promise.resolve(Object.assign(DEFAULT_INFO, { id }));
