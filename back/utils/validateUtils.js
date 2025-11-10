const { DIRS, isInt } = require('./nodeUtils');

function isNonEmptyString(s) {
  return typeof s === 'string' && s.trim().length > 0;
}

function validateDirectionsList(list) {
  if (!Array.isArray(list)) return false;
  return list.every((d) => DIRS.has(d));
}

function validateNodeShape(n) {
  if (!n || !isInt(n.x) || !isInt(n.y) || n.code == null) {
    return 'Node must have integer x, integer y, and a code';
  }
  if (n.name != null && !isNonEmptyString(n.name)) {
    return 'name must be a non-empty string if provided';
  }
  if (n.directions != null && !validateDirectionsList(n.directions)) {
    return 'directions must be an array of North/South/East/West';
  }
  if (n.charger != null) {
    if (typeof n.charger !== 'object' || !DIRS.has(n.charger.direction)) {
      return 'charger.direction must be North/South/East/West';
    }
  }
  if (n.chute != null) {
    if (typeof n.chute !== 'object' || !DIRS.has(n.chute.direction)) {
      return 'chute.direction must be North/South/East/West';
    }
  }
  return null;
}

function validateWholeMapShape(data) {
  if (!data || typeof data !== 'object' || !data.map || !Array.isArray(data.map.nodes)) {
    return 'Body must be { map: { nodes: [...] } }';
  }
  if (data.map.maxNeighborDistance != null) {
    if (!isInt(data.map.maxNeighborDistance) || data.map.maxNeighborDistance <= 0) {
      return 'maxNeighborDistance must be a positive integer';
    }
  }
  if (data.map.edges != null && !Array.isArray(data.map.edges)) {
    return 'map.edges must be an array if provided';
  }

  const seen = new Set();
  for (let i = 0; i < data.map.nodes.length; i++) {
    const n = data.map.nodes[i];
    const err = validateNodeShape(n);
    if (err) return `nodes[${i}]: ${err}`;
    const key = String(n.code);
    if (seen.has(key)) return `Duplicate code: ${n.code}`;
    seen.add(key);
  }
  return null;
}

module.exports = {
  validateNodeShape,
  validateDirectionsList,
  validateWholeMapShape,
};
