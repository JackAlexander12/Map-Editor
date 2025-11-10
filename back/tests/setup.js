global.inMemoryMap = {
  map: {
    maxNeighborDistance: 900,
    nodes: [
      { x: 0, y: 0, code: 1 },
      { x: 0, y: 800, code: 2 }
    ],
    edges: [{ from: 1, to: 2, length: 800 }]
  }
};

global.deepClone = (v) => JSON.parse(JSON.stringify(v));

beforeEach(() => {
  global.inMemoryMap = deepClone({
    map: {
      maxNeighborDistance: 900,
      nodes: [
        { x: 0, y: 0, code: 1 },
        { x: 0, y: 800, code: 2 }
      ],
      edges: [{ from: 1, to: 2, length: 800 }]
    }
  });
});
