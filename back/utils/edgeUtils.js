function getNodeByCode(data, code) {
  const key = String(code);
  return data.map.nodes.find(n => String(n.code) === key) || null;
}

function edgeLength(a, b) {
  if (a.x === b.x) return Math.abs(a.y - b.y);
  if (a.y === b.y) return Math.abs(a.x - b.x);
  return Infinity;
}

function normalizeEdgeOrThrow(data, from, to, maxDist) {
  if (from == null || to == null) throw new Error('edge must have from and to');
  if (String(from) === String(to)) throw new Error('from and to cannot be the same');

  const A = getNodeByCode(data, from);
  const B = getNodeByCode(data, to);
  if (!A || !B) throw new Error('edge references a node that does not exist');

  const len = edgeLength(A, B);
  if (!Number.isFinite(len)) {
    throw new Error('diagonal edges are not allowed (x OR y must match)');
  }
  if (len === 0) throw new Error('edge length must be > 0');

  const cap = maxDist ?? (data.map.maxNeighborDistance ?? 1500);
  if (len > cap) throw new Error(`edge length ${len} exceeds maxNeighborDistance ${cap}`);

  return { from, to, length: len };
}

function revalidateIncidentEdgesOrThrow(data, nodeCode) {
  const maxDist = data.map.maxNeighborDistance ?? 1500;
  const touching = (data.map.edges || []).filter(
    e => String(e.from) === String(nodeCode) || String(e.to) === String(nodeCode)
  );

  const errors = [];
  for (const e of touching) {
    try {
      const ne = normalizeEdgeOrThrow(data, e.from, e.to, maxDist);
      e.length = ne.length;
    } catch (err) {
      errors.push({ from: e.from, to: e.to, error: String(err.message || err) });
    }
  }

  if (errors.length) {
    const msg = 'Node change invalidates existing edge(s)';
    const detail = { error: msg, edges: errors };
    const er = new Error(JSON.stringify(detail));
    er._edgeValidation = detail;
    throw er;
  }
}

module.exports = {
  getNodeByCode,
  edgeLength,
  normalizeEdgeOrThrow,
  revalidateIncidentEdgesOrThrow,
};

