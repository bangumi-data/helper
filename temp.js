const tudou = require('./lib/spider/tudou');
const youku = require('./lib/spider/youku');

youku('4d8cce35815111e6b16e')
  .then(console.log)
