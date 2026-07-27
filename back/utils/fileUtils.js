const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '..', 'api', 'data', 'Map.json');
const DEFAULT_BOUNDS = { minX: 0, minY: 0, maxX: 150000, maxY: 150000 };

function cloneBounds(bounds = DEFAULT_BOUNDS) {
  return {
    minX: bounds.minX,
    minY: bounds.minY,
    maxX: bounds.maxX,
    maxY: bounds.maxY,
  };
}

function normalizeBounds(bounds) {
  if (
    bounds &&
    Number.isFinite(bounds.minX) &&
    Number.isFinite(bounds.minY) &&
    Number.isFinite(bounds.maxX) &&
    Number.isFinite(bounds.maxY)
  ) {
    return cloneBounds(bounds);
  }
  return cloneBounds(DEFAULT_BOUNDS);
}

function ensureFile() {
  const dir = path.dirname(DATA_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DATA_PATH)) {
    fs.writeFileSync(
      DATA_PATH,
      JSON.stringify({ map: { maxNeighborDistance: 1500, bounds: cloneBounds(), nodes: [], edges: [] } }, null, 2)
    );
  }
}

function readMap() {
  ensureFile();
  const raw = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  if (!raw.map) raw.map = {};
  raw.map.bounds = normalizeBounds(raw.map.bounds);
  if (!Array.isArray(raw.map.nodes)) raw.map.nodes = [];
  if (!Array.isArray(raw.map.edges)) raw.map.edges = [];
  if (!Number.isFinite(raw.map.maxNeighborDistance)) raw.map.maxNeighborDistance = 1500;
  return raw;
}

function writeMap(mapData) {
  ensureFile();
  if (!mapData.map) mapData.map = {};
  mapData.map.bounds = normalizeBounds(mapData.map.bounds);
  if (!Array.isArray(mapData.map.nodes)) mapData.map.nodes = [];
  if (!Array.isArray(mapData.map.edges)) mapData.map.edges = [];
  if (!Number.isFinite(mapData.map.maxNeighborDistance)) mapData.map.maxNeighborDistance = 1500;
  fs.writeFileSync(DATA_PATH, JSON.stringify(mapData, null, 2));
}

module.exports = { DATA_PATH, DEFAULT_BOUNDS, readMap, writeMap, normalizeBounds };
