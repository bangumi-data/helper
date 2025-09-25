const cheerio = require('cheerio');
const ora = require('ora');
const { fetch, matchBangumi } = require('../utils.js');

async function getPage(totalPage, startIndex) {
  const spinner = ora(`Crawling page ${startIndex/20}/${totalPage}`).start();
  const url = `https://www.amazon.co.jp/gp/video/api/paginateCollection?pageType=browse&pageId=default&collectionType=Container&actionScheme=default&payloadScheme=default&decorationScheme=web-liveFDP-decoration-asins-v2&featureScheme=web-search-v4&widgetScheme=web-explore-v16&variant=desktopWindows&journeyIngressContext=&isCleanSlateActive=1&paginationTargetId=V2%3D4AEA6u69gYPeuYe-toZwYWdlSWSIcGFnZVR5cGWMY29sbGVjdGlvbklkiHdpZGdldElkjo5zd2lmdElkVmVyc2lvbt6-iodkZWZhdWx0i4Zicm93c2WMjqRiOWI2NWZjMS1jOTRlLTQ1ZjYtOTVlZC00MmIwZjBhY2Y3MWOND46CVjI%3D&serviceToken=eyJ0eXBlIjoiaHBhZ2UiLCJuYXYiOmZhbHNlLCJwdCI6ImJyb3dzZSIsInBpIjoiZGVmYXVsdCIsInNlYyI6ImNlbnRlciIsInN0eXBlIjoic2VhcmNoIiwicXJ5IjoicXMtb2ZmZXJfdHlwZT0xJnFzLWNvdW50cnktY29kZT1KUCZwX25fd2F5c190b193YXRjaD0zNzQ2MzMwMDUxJmZpZWxkLWdlbnJlLWJpbj1hdl9nZW5yZV9hbmltZSZxcy1lbnRpdHlfdHlwZT0yJmZpZWxkLXdheXNfdG9fd2F0Y2g9Mzc0NjMzMDA1MSZwX25fZW50aXR5X3R5cGU9NDE3NDEwMDA1MXw0MTc0MDk5MDUxfDQxNzQwOTgwNTEmc2VhcmNoLWFsaWFzPWluc3RhbnQtdmlkZW8mYnE9KGFuZCAoYW5kIChhbmQgKGFuZCAoYW5kIChhbmQgKGFuZCAoYW5kIChhbmQgKGFuZCAoYW5kIChhbmQgKGFuZCAobm90IGF2X3NlY29uZGFyeV9nZW5yZTonYXZfc3ViZ2VucmVfaW50ZXJuYXRpb25hbF9pbmRpYScpIChub3QgYXZfa2lkX2luX3RlcnJpdG9yeTonSlAnKSkgKG5vdCBlbnRpdHlfdHlwZTonUHJvbW90aW9ufFRyYWlsZXJ8Qm9udXMgQ29udGVudCcpKSAobm90IGVudGl0eV90eXBlOidQcm9tb3Rpb258VHJhaWxlcnxCb251cyBDb250ZW50JykpIChub3QgZW50aXR5X3R5cGU6J1Byb21vdGlvbnxUcmFpbGVyfEJvbnVzIENvbnRlbnQnKSkgKG5vdCBlbnRpdHlfdHlwZTonUHJvbW90aW9ufFRyYWlsZXJ8Qm9udXMgQ29udGVudCcpKSAobm90IGVudGl0eV90eXBlOidQcm9tb3Rpb258VHJhaWxlcnxCb251cyBDb250ZW50JykpIChub3QgZW50aXR5X3R5cGU6J1Byb21vdGlvbnxUcmFpbGVyfEJvbnVzIENvbnRlbnQnKSkgKG5vdCBlbnRpdHlfdHlwZTonUHJvbW90aW9ufFRyYWlsZXJ8Qm9udXMgQ29udGVudCcpKSAobm90IGVudGl0eV90eXBlOidQcm9tb3Rpb258VHJhaWxlcnxCb251cyBDb250ZW50JykpIChub3QgZW50aXR5X3R5cGU6J1Byb21vdGlvbnxUcmFpbGVyfEJvbnVzIENvbnRlbnQnKSkgKG5vdCBlbnRpdHlfdHlwZTonUHJvbW90aW9ufFRyYWlsZXJ8Qm9udXMgQ29udGVudCcpKSAobm90IGVudGl0eV90eXBlOidQcm9tb3Rpb258VHJhaWxlcnxCb251cyBDb250ZW50JykpIChub3QgZW50aXR5X3R5cGU6J1Byb21vdGlvbnxUcmFpbGVyfEJvbnVzIENvbnRlbnQnKSkiLCJ0eHQiOiLjg5fjg6njgqTjg6Dnibnlhbjlr77osaHjga5UVueVque1hCIsIm9mZnNldCI6MCwibnBzaSI6MjAsIm9yZXEiOiJiOWI2NWZjMS1jOTRlLTQ1ZjYtOTVlZC00MmIwZjBhY2Y3MWM6MTczNjgyNzY4MDAwMCIsInN0S2V5Ijoie1wic2JzaW5cIjowLFwiY3Vyc2l6ZVwiOjM3OSxcInByZXNpemVcIjowfSIsIm9yZXFrIjoiNHpHZWxreXJZVUdJb0JxM2ZSUkorVThXRzRNaW5LRGxsa1dFd0Fia0Iwbz0iLCJvcmVxa3YiOjF9&startIndex=${startIndex}&dynamicFeatures`;
  const json = await fetch(url, { headers: { 'X-Requested-With': 'XMLHttpRequest' } })
    .then((res) => res.json());
  spinner.stop();

  const items = json.entities.map((item) => ({
    id: item.titleID,
    title: item.title,
  }));

  if (json.hasMoreItems === true) {
    return items.concat(await getPage(totalPage, json.pagination.startIndex));
  }
  return items;
}


exports.getAll = async function getAll() {
  // https://www.amazon.co.jp/gp/video/genre/anime/
  const spinner = ora(`Crawling page 1/?`).start();

  // crawl first page
  const $ = await fetch(`https://www.amazon.co.jp/gp/video/browse/ref=atv_unknown?serviceToken=eyJ0eXBlIjoiZmlsdGVyIiwibmF2Ijp0cnVlLCJzZWMiOiJjZW50ZXIiLCJzdHlwZSI6InNlYXJjaCIsInFyeSI6InFzLW9mZmVyX3R5cGU9MSZxcy1jb3VudHJ5LWNvZGU9SlAmcF9uX3dheXNfdG9fd2F0Y2g9Mzc0NjMzMDA1MSZmaWVsZC1nZW5yZS1iaW49YXZfZ2VucmVfYW5pbWUmcXMtZW50aXR5X3R5cGU9MiZmaWVsZC13YXlzX3RvX3dhdGNoPTM3NDYzMzAwNTEmcF9uX2VudGl0eV90eXBlPTQxNzQxMDAwNTF8NDE3NDA5OTA1MXw0MTc0MDk4MDUxJnNlYXJjaC1hbGlhcz1pbnN0YW50LXZpZGVvJmJxPShhbmQgKGFuZCAoYW5kIChhbmQgKGFuZCAoYW5kIChhbmQgKGFuZCAoYW5kIChhbmQgKGFuZCAoYW5kIChhbmQgKG5vdCBhdl9zZWNvbmRhcnlfZ2VucmU6J2F2X3N1YmdlbnJlX2ludGVybmF0aW9uYWxfaW5kaWEnKSAobm90IGF2X2tpZF9pbl90ZXJyaXRvcnk6J0pQJykpIChub3QgZW50aXR5X3R5cGU6J1Byb21vdGlvbnxUcmFpbGVyfEJvbnVzIENvbnRlbnQnKSkgKG5vdCBlbnRpdHlfdHlwZTonUHJvbW90aW9ufFRyYWlsZXJ8Qm9udXMgQ29udGVudCcpKSAobm90IGVudGl0eV90eXBlOidQcm9tb3Rpb258VHJhaWxlcnxCb251cyBDb250ZW50JykpIChub3QgZW50aXR5X3R5cGU6J1Byb21vdGlvbnxUcmFpbGVyfEJvbnVzIENvbnRlbnQnKSkgKG5vdCBlbnRpdHlfdHlwZTonUHJvbW90aW9ufFRyYWlsZXJ8Qm9udXMgQ29udGVudCcpKSAobm90IGVudGl0eV90eXBlOidQcm9tb3Rpb258VHJhaWxlcnxCb251cyBDb250ZW50JykpIChub3QgZW50aXR5X3R5cGU6J1Byb21vdGlvbnxUcmFpbGVyfEJvbnVzIENvbnRlbnQnKSkgKG5vdCBlbnRpdHlfdHlwZTonUHJvbW90aW9ufFRyYWlsZXJ8Qm9udXMgQ29udGVudCcpKSAobm90IGVudGl0eV90eXBlOidQcm9tb3Rpb258VHJhaWxlcnxCb251cyBDb250ZW50JykpIChub3QgZW50aXR5X3R5cGU6J1Byb21vdGlvbnxUcmFpbGVyfEJvbnVzIENvbnRlbnQnKSkgKG5vdCBlbnRpdHlfdHlwZTonUHJvbW90aW9ufFRyYWlsZXJ8Qm9udXMgQ29udGVudCcpKSAobm90IGVudGl0eV90eXBlOidQcm9tb3Rpb258VHJhaWxlcnxCb251cyBDb250ZW50JykpIiwidHh0Ijoi44OX44Op44Kk44Og54m55YW45a%2B%2B6LGh44GuVFbnlarntYQiLCJmaWx0ZXIiOnt9LCJvZmZzZXQiOjAsIm5wc2kiOjAsIm9yZXEiOiIyNTZkZWMwNi05ZjVkLTRmNjItYWM5ZS1jYmYyNjRkM2I1YTY6MTczNjgyNzY3NjAwMCIsInN0S2V5Ijoie1wic2JzaW5cIjowLFwiY3Vyc2l6ZVwiOjM3OSxcInByZXNpemVcIjowfSIsIm9yZXFrIjoiNHpHZWxreXJZVUdJb0JxM2ZSUkorVThXRzRNaW5LRGxsa1dFd0Fia0Iwbz0iLCJvcmVxa3YiOjF9`)
    .then((res) => res.text())
    .then(cheerio.load);
  spinner.stop();

  const json = JSON.parse($('script[type="text/template"]:contains(paginationServiceToken)').text());
  const data = json.props.body[0].props.browse.containers[0];
  let items = data.entities.map((item) => ({
    id: item.titleID,
    title: item.title,
  }));
  const totalPage = Math.ceil(data.estimatedTotal / 20);
  items.push(...await getPage(totalPage, data.paginationStartIndex));

  // Remove duplicates based on id
  const uniqueItems = Array.from(new Map(items.map(item => [item.id, item])).values());

  return uniqueItems;
};

exports.getBegin = async function getBegin(id) {
  return '';
};

exports.matchBangumi = async (input, items) => {
  return matchBangumi(input, { items });
}

exports.getIsBangumiOffline = async (id) => {
  const url = `https://www.amazon.co.jp/gp/video/detail/${id}`;
  return await fetch(url)
    .then((res) => res.status === 404);
}
