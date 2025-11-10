const DIRS = new Set(['North', 'South', 'East', 'West']);

const asKey = (v) => String(v);

function isInt(n) {
  return Number.isFinite(n) && Math.floor(n) === n;
}

function findIndexByCode(data, code) {
  const key = asKey(code);
  return data.map.nodes.findIndex((n) => asKey(n.code) === key);
}

module.exports = { DIRS, asKey, isInt, findIndexByCode };
