const express = require('express');
const cors = require('cors');

const { readMap, writeMap } = require('./utils/fileUtils');
const { asKey, findIndexByCode } = require('./utils/nodeUtils');
const {
  validateNodeShape,
  validateWholeMapShape,
} = require('./utils/validateUtils');
const { normalizeEdgeOrThrow, revalidateIncidentEdgesOrThrow } = require('./utils/edgeUtils');

const app = express();

app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.json());

// checks for server working
app.get('/works', (_req, res) => res.json({ ok: true }));

// read map but if there is no edges array set it to empty array
app.get('/api/map', (_req, res) => {
  try {
    const mapData = readMap();
    if (!Array.isArray(mapData.map.edges)) mapData.map.edges = [];
    res.json(mapData);
  } catch (err) {
    console.error('Error reading map data:', err);
    res.status(500).json({ error: 'Failed to read map data' });
  }
});

app.put('/api/map', (req, res) => {
  try {
    const incoming = req.body;

    const shapeErr = validateWholeMapShape(incoming);
    if (shapeErr) return res.status(400).json({ error: shapeErr });

    const cap = incoming?.map?.maxNeighborDistance;
    if (!Number.isInteger(cap) || cap <= 0) {
      return res
        .status(400)
        .json({ error: 'map.maxNeighborDistance is required and must be a positive integer' });
    }

    if (!Array.isArray(incoming.map.edges)) incoming.map.edges = [];

    const seen = new Set();
    const normalized = [];
    for (const e of incoming.map.edges) {
      const ne = normalizeEdgeOrThrow(
        incoming,
        e.from,
        e.to,
        incoming.map.maxNeighborDistance
      );
      const a = `${ne.from}-${ne.to}`;
      const b = `${ne.to}-${ne.from}`;
      if (seen.has(a) || seen.has(b)) continue;
      seen.add(a);
      seen.add(b);
      normalized.push(ne);
    }
    incoming.map.edges = normalized;

    writeMap(incoming);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: String(err.message || err) });
  }
});

app.patch('/api/map', (req, res) => {
  try {
    const body = req.body;
    //checks map validity
    if (!body?.map || !Array.isArray(body.map.nodes)) {
      return res.status(400).json({ error: 'Body must be { map: { nodes: [...] } }' });
    }
    //checks if there is a maxneighbordistance and if its positive int
    if (
      !Number.isInteger(body.map.maxNeighborDistance) ||
      body.map.maxNeighborDistance <= 0
    ) {
      return res
        .status(400)
        .json({ error: 'map.maxNeighborDistance is required and must be a positive integer' });
    }

    // loads current map and checks if edges exists
    const data = readMap();
    if (!Array.isArray(data.map.edges)) data.map.edges = [];

    // index existing nodes by their code
    const byCode = new Map(data.map.nodes.map((n) => [asKey(n.code), n]));
    for (const raw of body.map.nodes) {
      const mergedNode = { ...(byCode.get(asKey(raw.code)) || {}), ...raw };
      const err = validateNodeShape(mergedNode);
      if (err) return res.status(400).json({ error: err, node: raw });
      byCode.set(asKey(mergedNode.code), mergedNode);
    }

    const merged = {
      map: {
        maxNeighborDistance: body.map.maxNeighborDistance,
        nodes: Array.from(byCode.values()),
        edges: data.map.edges,
      },
    };

    // add new edges in patch (dedupe both orientations)
    const inEdges = Array.isArray(body.map.edges) ? body.map.edges : [];
    const edSet = new Set(merged.map.edges.map((e) => `${e.from}-${e.to}`));
    const addEdges = [];

    // check against already merged nodes if edges can exist
    for (const e of inEdges) {
      const ne = normalizeEdgeOrThrow(merged, e.from, e.to, merged.map.maxNeighborDistance);
      const k1 = `${ne.from}-${ne.to}`;
      const k2 = `${ne.to}-${ne.from}`;
      if (!edSet.has(k1) && !edSet.has(k2)) {
        edSet.add(k1);
        edSet.add(k2);
        addEdges.push(ne);
      }
    }
    merged.map.edges = [...merged.map.edges, ...addEdges];

    // recheck again (prevents "nodes moved but edges stayed" by recomputing lengths)
    try {
      const maxDist = merged.map.maxNeighborDistance;
      merged.map.edges = merged.map.edges.map((e) => {
        const ne = normalizeEdgeOrThrow(merged, e.from, e.to, maxDist);
        return { from: ne.from, to: ne.to, length: ne.length };
      });
    } catch (e) {
      return res.status(400).json({ error: String(e.message || e) });
    }

    writeMap(merged);
    res.json({ ok: true, nodes: merged.map.nodes.length, edges: merged.map.edges.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to merge map data' });
  }
});

app.post('/api/nodes', (req, res) => {
  try {
    const node = req.body;
    const err = validateNodeShape(node);
    if (err) return res.status(400).json({ error: err });

    const data = readMap();
    if (findIndexByCode(data, node.code) !== -1) {
      return res.status(409).json({ error: 'Node with this code already exists' });
    }

    data.map.nodes.push(node);
    writeMap(data);
    res.status(201).json({ ok: true, node });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add node' });
  }
});

app.post('/api/nodes/bulk', (req, res) => {
  try {
    //checks body
    const arr = Array.isArray(req.body?.nodes) ? req.body.nodes : null;
    if (!arr) return res.status(400).json({ error: 'Body must be { nodes: [...] }' });
    //consts
    const data = readMap();
    const seenCodes = new Set(data.map.nodes.map((n) => String(n.code)));
    const added = [];
    const skipped = [];
    //loops through all the incoming nodes
    for (const n of arr) {
      const err = validateNodeShape(n);
      if (err) {
        skipped.push({ code: n?.code, reason: err });
        continue;
      }
      const k = String(n.code);
      if (seenCodes.has(k)) {
        skipped.push({ code: n.code, reason: 'duplicate code' });
        continue;
      }
      added.push(n);
      seenCodes.add(k);
    }

    if (added.length) {
      data.map.nodes.push(...added);
      writeMap(data);
    }

    res.status(201).json({ ok: true, added: added.length, skipped });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add nodes' });
  }
});

app.put('/api/nodes/:code', (req, res) => {
  try {
    const code = req.params.code;
    const node = req.body;

    const data = readMap();
    const idx = findIndexByCode(data, code);
    if (idx === -1) return res.status(404).json({ error: 'Node not found' });

    // Enforce code immutability on PUT
    node.code = data.map.nodes[idx].code;

    const err = validateNodeShape(node);
    if (err) return res.status(400).json({ error: err });

    data.map.nodes[idx] = node;

    try {
      revalidateIncidentEdgesOrThrow(data, node.code);
    } catch (e) {
      // revert this node only
      data.map.nodes[idx] = readMap().map.nodes[idx] || data.map.nodes[idx];
      return res.status(400).json(e._edgeValidation || { error: String(e.message || e) });
    }

    writeMap(data);
    res.json({ ok: true, node });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update node' });
  }
});

app.patch('/api/nodes/:code', (req, res) => {
  try {
    const code = req.params.code;
    const patch = req.body || {};

    const data = readMap();
    const idx = findIndexByCode(data, code);
    if (idx === -1) return res.status(404).json({ error: 'Node not found' });

    const next = { ...data.map.nodes[idx], ...patch, code: data.map.nodes[idx].code };
    const err = validateNodeShape(next);
    if (err) return res.status(400).json({ error: err });

    data.map.nodes[idx] = next;

    try {
      revalidateIncidentEdgesOrThrow(data, next.code);
    } catch (e) {
      data.map.nodes[idx] = readMap().map.nodes[idx] || data.map.nodes[idx];
      return res.status(400).json(e._edgeValidation || { error: String(e.message || e) });
    }

    writeMap(data);
    res.json({ ok: true, node: next });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to patch node' });
  }
});

app.delete('/api/nodes/:code', (req, res) => {
  try {
    const code = req.params.code;
    const data = readMap();
    const idx = findIndexByCode(data, code);
    if (idx === -1) return res.status(404).json({ error: 'Node not found' });

    const removedCode = data.map.nodes[idx].code;
    data.map.nodes.splice(idx, 1);
    data.map.edges = (data.map.edges || []).filter(
      (e) => String(e.from) !== String(removedCode) && String(e.to) !== String(removedCode)
    );

    writeMap(data);
    res.json({ ok: true, removed: removedCode });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete node' });
  }
});

app.get('/api/edges', (_req, res) => {
  const data = readMap();
  if (!Array.isArray(data.map.edges)) data.map.edges = [];
  res.json({ edges: data.map.edges });
});

app.post('/api/edges', (req, res) => {
  try {
    const { from, to } = req.body || {};
    const data = readMap();
    if (!Array.isArray(data.map.edges)) data.map.edges = [];

    const edge = normalizeEdgeOrThrow(data, from, to, data.map.maxNeighborDistance);

    const exists = data.map.edges.some(
      (e) =>
        (String(e.from) === String(from) && String(e.to) === String(to)) ||
        (String(e.from) === String(to) && String(e.to) === String(from))
    );
    if (exists) return res.status(409).json({ error: 'edge already exists' });

    data.map.edges.push(edge);
    writeMap(data);
    res.status(201).json({ ok: true, edge });
  } catch (err) {
    res.status(400).json({ error: String(err.message || err) });
  }
});

app.delete('/api/edges', (req, res) => {
  const { from, to } = req.body || {};
  const data = readMap();
  if (!Array.isArray(data.map.edges)) data.map.edges = [];

  const before = data.map.edges.length;
  data.map.edges = data.map.edges.filter(
    (e) =>
      !(
        (String(e.from) === String(from) && String(e.to) === String(to)) ||
        (String(e.from) === String(to) && String(e.to) === String(from))
      )
  );

  if (data.map.edges.length === before) return res.status(404).json({ error: 'edge not found' });

  writeMap(data);
  res.json({ ok: true });
});

const PORT = process.env.PORT || 5000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\nServer is running on http://localhost:${PORT}\n`);
  });
}

module.exports = app;
