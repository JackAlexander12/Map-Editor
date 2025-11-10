jest.mock('../utils/fileUtils', () => {
  let store = {
    map: {
      maxNeighborDistance: 900,
      nodes: [
        { x: 0, y: 0, code: 1 },
        { x: 0, y: 800, code: 2 }
      ],
      edges: [{ from: 1, to: 2, length: 800 }]
    }
  };

  const clone = (v) => JSON.parse(JSON.stringify(v));

  return {
    DATA_PATH: '/dev/null',
    readMap: () => clone(store),
    writeMap: (data) => { store = clone(data); },

    __setMockMap: (next) => { store = clone(next); },
    __getMockMap: () => clone(store)
  };
});

const { __setMockMap, __getMockMap } = require('../utils/fileUtils');
const request = require('supertest');
const app = require('../server'); 

beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterAll(() => {
  console.error.mockRestore();
});

const baselineMap = () => ({
  map: {
    maxNeighborDistance: 900,
    nodes: [
      { x: 0, y: 0, code: 1 },
      { x: 0, y: 800, code: 2 }
    ],
    edges: [{ from: 1, to: 2, length: 800 }]
  }
});

beforeEach(() => {
  __setMockMap(baselineMap());
});

describe('server routes', () => {
  test('GET /works', async () => {
    const res = await request(app).get('/works');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  test('GET /api/map returns map', async () => {
    const res = await request(app).get('/api/map');
    expect(res.status).toBe(200);
    expect(res.body.map.nodes.length).toBe(2);
    expect(Array.isArray(res.body.map.edges)).toBe(true);
  });

  test('GET /api/edges returns current edges array', async () => {
    const res = await request(app).get('/api/edges');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.edges)).toBe(true);
  });

  test('PUT /api/map rejects diagonal edges', async () => {
    const good = baselineMap();
    let res = await request(app).put('/api/map').send(good);
    expect(res.status).toBe(200);

    const bad = baselineMap();
    bad.map.nodes[1] = { x: 100, y: 700, code: 2 }; 
    bad.map.edges = [{ from: 1, to: 2 }];
    res = await request(app).put('/api/map').send(bad);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/diagonal edges are not allowed/i);
  });

  test('PUT /api/map de-dupes edges in both orientations', async () => {
    const body = {
      map: {
        maxNeighborDistance: 900,
        nodes: [
          { x: 0, y: 0, code: 1 }, { x: 0, y: 800, code: 2 }
        ],
        edges: [{ from: 1, to: 2 }, { from: 2, to: 1 }]
      }
    };
    const res = await request(app).put('/api/map').send(body);
    expect(res.status).toBe(200);

    const after = __getMockMap();
    const e = after.map.edges.filter(
      (e) =>
        (String(e.from) === '1' && String(e.to) === '2') ||
        (String(e.from) === '2' && String(e.to) === '1')
    );
    expect(e.length).toBe(1);
    expect(e[0].length).toBe(800);
  });

  test('PUT /api/map rejects edges with unknown nodes / zero-length / over-cap', async () => {
    const base = baselineMap();

    base.map.edges = [{ from: 1, to: 999 }];
    let res = await request(app).put('/api/map').send(base);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/does not exist/i);

    const z = baselineMap();
    z.map.nodes.push({ x: 0, y: 0, code: 9 });
    z.map.edges = [{ from: 1, to: 9 }];
    res = await request(app).put('/api/map').send(z);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/edge length must be > 0/i);

    const far = baselineMap();
    far.map.nodes[1] = { x: 0, y: 2000, code: 2 };
    far.map.edges = [{ from: 1, to: 2 }];
    res = await request(app).put('/api/map').send(far);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/exceeds maxNeighborDistance/i);
  });

  test('PATCH /api/map requires maxNeighborDistance', async () => {
    const res = await request(app).patch('/api/map').send({
      map: { nodes: [{ code: 2, x: 0, y: 900 }] } // no cap
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/maxNeighborDistance is required/i);
  });

  test('PATCH /api/map merges nodes and recomputes edge length (cap required)', async () => {
    const patch = {
      map: {
        maxNeighborDistance: 2000,
        nodes: [{ code: 2, x: 0, y: 900 }],
        edges: [{ from: 1, to: 2 }]
      }
    };
    const res = await request(app).patch('/api/map').send(patch);
    expect(res.status).toBe(200);

    const e = __getMockMap().map.edges.find(
      (e) =>
        (String(e.from) === '1' && String(e.to) === '2') ||
        (String(e.from) === '2' && String(e.to) === '1')
    );
    expect(e.length).toBe(900);
  });

  test('PATCH /api/map recomputes existing edges and enforces lowered cap', async () => {
    let res = await request(app).patch('/api/map').send({
      map: { maxNeighborDistance: 2000, nodes: [{ code: 2, x: 0, y: 850 }] }
    });
    expect(res.status).toBe(200);
    expect(__getMockMap().map.edges[0].length).toBe(850);

    res = await request(app).patch('/api/map').send({
      map: { maxNeighborDistance: 800, nodes: [] }
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/exceeds maxNeighborDistance/i);
  });

  test('POST /api/nodes creates and deduplicates, and invalid payload 400', async () => {
    const first = await request(app).post('/api/nodes').send({ x: 1000, y: 0, code: 3 });
    expect(first.status).toBe(201);
    expect(first.body.ok).toBe(true);

    const dup = await request(app).post('/api/nodes').send({ x: 1000, y: 0, code: 3 });
    expect(dup.status).toBe(409);

    const bad = await request(app).post('/api/nodes').send({ x: 1.5, y: 0, code: 7 });
    expect(bad.status).toBe(400);
    expect(bad.body.error).toMatch(/integer x/i);
  });

  test('POST /api/nodes/bulk adds and skips invalid, and enforces body shape', async () => {
    const res = await request(app).post('/api/nodes/bulk').send({
      nodes: [
        { x: 10, y: 10, code: 10 },      
        { x: 10.5, y: 0, code: 11 },     
        { x: 0, y: 800, code: 2 }    
      ]
    });
    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(res.body.added).toBe(1);
    expect(res.body.skipped.length).toBe(2);

    const res2 = await request(app).post('/api/nodes/bulk').send({ nope: [] });
    expect(res2.status).toBe(400);
    expect(res2.body.error).toMatch(/Body must be \{ nodes: \[\.\.\.\] \}/i);
  });

  test('PUT /api/nodes/:code fails when incident edge exceeds max distance and 404 when missing', async () => {
    const res = await request(app).put('/api/nodes/2').send({ x: 0, y: 2000, code: 2 });
    expect(res.status).toBe(400);

    const notFound = await request(app).put('/api/nodes/999').send({ x: 0, y: 0, code: 999 });
    expect(notFound.status).toBe(404);
  });

  test('PUT /api/nodes/:code does not allow code change', async () => {
    const res = await request(app).put('/api/nodes/2').send({ x: 0, y: 800, code: 999 });
    expect(res.status).toBe(200);
    const after = __getMockMap();
    const n2 = after.map.nodes.find((n) => String(n.code) === '2');
    expect(n2).toBeTruthy();
  });

  test('PATCH /api/nodes/:code updates and revalidates, 404 when missing', async () => {
    const res = await request(app).patch('/api/nodes/2').send({ y: 850 });
    expect(res.status).toBe(200);
    const edge = __getMockMap().map.edges.find(
      (e) =>
        (String(e.from) === '1' && String(e.to) === '2') ||
        (String(e.from) === '2' && String(e.to) === '1')
    );
    expect(edge.length).toBe(850);

    const notFound = await request(app).patch('/api/nodes/999').send({ y: 1 });
    expect(notFound.status).toBe(404);
  });

  test('DELETE /api/nodes/:code removes node and edges, 404 when missing', async () => {
    const res = await request(app).delete('/api/nodes/2');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);

    const after = __getMockMap();
    expect(after.map.nodes.find((n) => n.code === 2)).toBeUndefined();
    expect(after.map.edges.length).toBe(0);

    const notFound = await request(app).delete('/api/nodes/999');
    expect(notFound.status).toBe(404);
  });

  test('POST /api/edges creates and validates more cases', async () => {
    await request(app).post('/api/nodes').send({ x: 500, y: 0, code: 3 });
    let res = await request(app).post('/api/edges').send({ from: 1, to: 3 });
    expect(res.status).toBe(201);
    expect(res.body.edge.length).toBe(500);

    res = await request(app).post('/api/edges').send({ from: 3, to: 1 });
    expect(res.status).toBe(409); 

    await request(app).post('/api/nodes').send({ x: 100, y: 100, code: 4 });
    res = await request(app).post('/api/edges').send({ from: 1, to: 4 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/diagonal/i);

    res = await request(app).post('/api/edges').send({ from: 1, to: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/cannot be the same/i);

    res = await request(app).post('/api/edges').send({ from: 1, to: 999 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/does not exist/i);

    await request(app).post('/api/nodes').send({ x: 0, y: 2000, code: 99 });
    res = await request(app).post('/api/edges').send({ from: 1, to: 99 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/exceeds maxNeighborDistance/i);
  });

  test('DELETE /api/edges removes or 404s and supports reverse orientation', async () => {
    let res = await request(app).delete('/api/edges').send({ from: 1, to: 2 });
    expect(res.status).toBe(200);

    await request(app).post('/api/edges').send({ from: 1, to: 2 });
    res = await request(app).delete('/api/edges').send({ from: 2, to: 1 });
    expect(res.status).toBe(200);

    res = await request(app).delete('/api/edges').send({ from: 1, to: 2 });
    expect(res.status).toBe(404);
  });
});

describe('PUT/PATCH /api/nodes/:code returns detailed _edgeValidation shape', () => {
  test('PUT causes incident edge to exceed cap -> returns { error, edges:[{from,to,error}] }', async () => {
    let res = await request(app).patch('/api/map').send({
      map: { maxNeighborDistance: 700, nodes: [{ code: 2, x: 0, y: 700 }] }
    });
    expect(res.status).toBe(200);

    res = await request(app).put('/api/nodes/2').send({ x: 0, y: 800, code: 2 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalidates existing edge/i);
    expect(Array.isArray(res.body.edges)).toBe(true);
    expect(res.body.edges[0]).toEqual(
      expect.objectContaining({ from: 1, to: 2, error: expect.stringMatching(/exceeds/i) })
    );
  });

  test('PATCH moves node to diagonal relative to its neighbor -> structured payload', async () => {
    let res = await request(app).patch('/api/map').send({
      map: { maxNeighborDistance: 5000, nodes: [] }
    });
    expect(res.status).toBe(200);

    res = await request(app).patch('/api/nodes/2').send({ x: 100, y: 800 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalidates existing edge/i);
    expect(Array.isArray(res.body.edges)).toBe(true);
    expect(res.body.edges[0]).toEqual(
      expect.objectContaining({ from: 1, to: 2, error: expect.stringMatching(/diagonal/i) })
    );
  });
});

describe('POST /api/nodes/bulk handles within-payload duplicates', () => {
  test('adds first, skips second as duplicate', async () => {
    const res = await request(app).post('/api/nodes/bulk').send({
      nodes: [
        { x: 10, y: 10, code: 10 },
        { x: 20, y: 20, code: 10 }
      ]
    });
    expect(res.status).toBe(201);
    expect(res.body.added).toBe(1);
    expect(res.body.skipped).toEqual(
      expect.arrayContaining([ expect.objectContaining({ code: 10, reason: 'duplicate code' }) ])
    );
  });
});

describe('POST /api/edges parameter validation & normalization', () => {
  test('400 when from/to missing', async () => {
    let res = await request(app).post('/api/edges').send({ from: 1 }); 
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/must have from and to/i);

    res = await request(app).post('/api/edges').send({ to: 2 }); 
    expect(res.status).toBe(400);
  });

  test('string vs number codes are accepted and length computed', async () => {
    await request(app).post('/api/nodes').send({ x: 500, y: 0, code: 3 });

    const res = await request(app).post('/api/edges').send({ from: '1', to: '3' });
    expect(res.status).toBe(201);
    expect(res.body.edge.length).toBe(500);
  });

  test('zero-length via different codes at same coords is rejected (normalize throws)', async () => {
    await request(app).post('/api/nodes').send({ x: 0, y: 0, code: 9 }); 
    const res = await request(app).post('/api/edges').send({ from: 1, to: 9 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/edge length must be > 0/i);
  });
});

describe('DELETE /api/edges missing body', () => {
  test('404 when from/to not provided', async () => {
    const res = await request(app).delete('/api/edges').send({});
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/edge not found/i);
  });
});

describe('PUT /api/map de-dupes repeated orientations', () => {
  test('multiple duplicates collapse to a single undirected edge', async () => {
    const body = {
      map: {
        maxNeighborDistance: 900,
        nodes: [
          { x: 0, y: 0, code: 1 },
          { x: 0, y: 800, code: 2 }
        ],
        edges: [
          { from: 1, to: 2 },
          { from: 1, to: 2 },
          { from: 2, to: 1 }
        ]
      }
    };
    const res = await request(app).put('/api/map').send(body);
    expect(res.status).toBe(200);

    const after = __getMockMap();
    const matches = after.map.edges.filter(
      (e) =>
        (String(e.from)==='1' && String(e.to)==='2') ||
        (String(e.from)==='2' && String(e.to)==='1')
    );
    expect(matches.length).toBe(1);
    expect(matches[0].length).toBe(800);
  });
});
