module.exports = function(items) {
  const data = {};
  items.forEach(item => {
    if (!item.begin) return;
    const year = item.begin.slice(0, 4);
    const month = item.begin.slice(5, 7);
    data[year] = data[year] || {};
    data[year][month] = data[year][month] || [];
    data[year][month].push(item);
  });
  return data;
};
