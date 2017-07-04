const DEFAULT_INFO = {
  site: 'acfun',
  id: '',
  begin: '',
  official: false,
  premuiumOnly: false,
  censored: false,
  lang: 'zh-Hans',
  comment: '',
};

module.exports = async id =>
  Object.assign({}, DEFAULT_INFO, { id });
