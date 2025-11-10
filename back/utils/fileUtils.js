const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '..', 'api', 'data', 'map.json');

function readMap() {
  const raw = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  if (!raw.map) raw.map = {};
  if (!Array.isArray(raw.map.nodes)) raw.map.nodes = [];
  if (!Array.isArray(raw.map.edges)) raw.map.edges = [];
  if (!Number.isFinite(raw.map.maxNeighborDistance)) raw.map.maxNeighborDistance = 1500;
  return raw;
}

function writeMap(mapData) {
  if (!mapData.map) mapData.map = {};
  if (!Array.isArray(mapData.map.nodes)) mapData.map.nodes = [];
  if (!Array.isArray(mapData.map.edges)) mapData.map.edges = [];
  if (!Number.isFinite(mapData.map.maxNeighborDistance)) mapData.map.maxNeighborDistance = 1500;
  fs.writeFileSync(DATA_PATH, JSON.stringify(mapData, null, 2));
}

module.exports = { DATA_PATH, readMap, writeMap };
