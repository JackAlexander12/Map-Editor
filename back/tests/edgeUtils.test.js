const {
  getNodeByCode,
  edgeLength,
  normalizeEdgeOrThrow,
  revalidateIncidentEdgesOrThrow
} = require('../utils/edgeUtils');

const makeData = () => ({
  map: {
    maxNeighborDistance: 900,
    nodes: [
      { x: 0, y: 0, code: 1 },
      { x: 0, y: 800, code: 2 },
      { x: 500, y: 0, code: 3 },
      { x: 0, y: 0, code: 9 } 
    ],
    edges: [{ from: 1, to: 2, length: 800 }]
  }
});

test('getNodeByCode', () => {
  const data = makeData();
  expect(getNodeByCode(data, 1).y).toBe(0);
  expect(getNodeByCode(data, '2').y).toBe(800);
  expect(getNodeByCode(data, 999)).toBeNull();
});

test('edgeLength axis-aligned vs diagonal', () => {
  const a = { x: 0, y: 0 }, b = { x: 0, y: 800 }, c = { x: 100, y: 100 };
  expect(edgeLength(a, b)).toBe(800);
  expect(edgeLength(a, c)).toBe(Infinity);
});

test('normalizeEdgeOrThrow', () => {
  const data = makeData();
  expect(normalizeEdgeOrThrow(data, 1, 2).length).toBe(800);
  expect(() => normalizeEdgeOrThrow(data, 1, 1)).toThrow(/cannot be the same/);
  expect(() => normalizeEdgeOrThrow(data, 1, 999)).toThrow(/does not exist/);

  const far = makeData();
  far.map.nodes[1] = { x: 0, y: 2000, code: 2 };
  expect(() => normalizeEdgeOrThrow(far, 1, 2)).toThrow(/exceeds maxNeighborDistance/i);
});

test('revalidateIncidentEdgesOrThrow', () => {
  const data = makeData();
  data.map.nodes[1].y = 850;
  revalidateIncidentEdgesOrThrow(data, 2);
  expect(data.map.edges[0].length).toBe(850);

  data.map.nodes[1].y = 2000;
  expect(() => revalidateIncidentEdgesOrThrow(data, 2)).toThrow(/invalidates existing edge/i);
});

test('normalizeEdgeOrThrow rejects zero-length edges', () => {
  const d = makeData();
  expect(() => normalizeEdgeOrThrow(d, 1, 9)).toThrow(/edge length must be > 0/i);
});

test('normalizeEdgeOrThrow missing params', () => {
  const d = makeData();

  expect(() => normalizeEdgeOrThrow(d, 1, undefined)).toThrow(/must have from and to/i);
});

test('normalizeEdgeOrThrow explicit maxDist override works', () => {
  const d = makeData();

  d.map.nodes[1].y = 2000;

  expect(() => normalizeEdgeOrThrow(d, 1, 2)).toThrow(/exceeds maxNeighborDistance/i);

  const e = normalizeEdgeOrThrow(d, 1, 2, 5000);
  expect(e.length).toBe(2000);
});
describe('edgeLength more cases', () => {
  test('zero-length when points equal', () => {
    const a = { x: 5, y: -10 };
    expect(edgeLength(a, a)).toBe(0);
  });

  test('negative coordinates on same axis compute absolute length', () => {
    const a = { x: -5, y: 0 }, b = { x: -12, y: 0 };
    expect(edgeLength(a, b)).toBe(7);
  });

  test('symmetry A->B equals B->A', () => {
    const a = { x: 0, y: 0 }, b = { x: 0, y: 800 };
    expect(edgeLength(a, b)).toBe(edgeLength(b, a));
  });
});
describe('normalizeEdgeOrThrow default cap (1500) when maxNeighborDistance missing', () => {
  test('enforces 1500 fallback', () => {
    const data = {
      map: {
        nodes: [
          { x: 0, y: 0, code: 1 },
          { x: 0, y: 1600, code: 2 }
        ],
        edges: []
      }
    };
    expect(() => normalizeEdgeOrThrow(data, 1, 2)).toThrow(/exceeds maxNeighborDistance 1500/i);
  });
});

